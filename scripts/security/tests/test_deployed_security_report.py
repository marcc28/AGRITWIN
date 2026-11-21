"""Verify production-scope restrictions and truthful report outcomes offline."""

import copy
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import deployed_security_report as review


class ScopeTests(unittest.TestCase):
    def test_only_static_get_operations_are_selected(self):
        source = {
            "openapi": "3.1.0",
            "servers": [{"url": "https://outside.example"}],
            "paths": {
                "/api/v1/users": {
                    "servers": [{"url": "https://outside.example"}],
                    "get": {"servers": [{"url": "https://outside.example"}], "parameters": [{"name": "limit", "in": "query"}]},
                    "post": {},
                },
                "/api/v1/users/{id}": {"get": {}, "delete": {}},
                "/api/v1/logout": {"get": {}},
                "/api/v1/weather/forecast": {"get": {}},
                "/api/v1/search": {"get": {"parameters": [{"name": "q", "required": True}]}},
                "//outside.example": {"get": {}},
            },
        }
        original = copy.deepcopy(source)
        selected_spec, selected, omitted = review.readonly_specification(source)
        self.assertEqual(source, original)
        self.assertEqual(selected, [{"method": "GET", "path": "/api/v1/users"}])
        self.assertEqual(len(omitted), 7)
        self.assertEqual(selected_spec["servers"], [{"url": review.TARGET}])
        self.assertEqual(set(selected_spec["paths"]["/api/v1/users"]), {"get"})
        operation = selected_spec["paths"]["/api/v1/users"]["get"]
        self.assertNotIn("servers", operation)
        self.assertEqual(operation["parameters"][0]["schema"]["maximum"], 1)

    def test_external_schema_references_are_rejected(self):
        source = {"openapi": "3.0.0", "paths": {"/ping": {"get": {}}}, "components": {"schemas": {"Other": {"$ref": "https://outside.example/schema"}}}}
        with self.assertRaises(ValueError):
            review.readonly_specification(source)

    def test_redirect_scope_rejects_other_hosts_and_credentials(self):
        for url in ("http://backend-web-ur8z.onrender.com/ping", "https://outside.example/", "https://user:password@backend-web-ur8z.onrender.com/"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                review.validate_url(url)
        review.validate_url(review.TARGET + "/ping")

    def test_report_escapes_untrusted_scanner_text(self):
        finding = {"severity": "low", "title": "<script>alert(1)</script>", "url": review.TARGET, "description": "<img src=x>", "recommendation": "<b>review</b>"}
        rendered = review.html_report("Report", [], [finding])
        self.assertNotIn("<script>", rendered)
        self.assertIn("&lt;script&gt;", rendered)


class OutcomeTests(unittest.TestCase):
    def test_missing_scanner_reports_are_errors_not_clean_results(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            old_cwd = Path.cwd()
            os.chdir(root)
            try:
                with patch.object(review, "OUTPUT", root / "reports/security"), patch.object(review, "WORK", root / "reports/security/.work"), patch.object(review, "build_manifest", return_value={"commit": "a" * 40, "run_id": "1"}), patch.object(review, "fetch") as fetch:
                    fetch.return_value = {"http_status": 200, "body": json.dumps({"openapi": "3.1.0", "paths": {"/ping": {"get": {}}}}).encode(), "headers": {}, "duration_ms": 1}
                    review.prepare()
                    review.finalize()
                    report = json.loads((review.OUTPUT / "execution-report.json").read_text())
                    self.assertEqual(report["execution_status"], "error")
                    self.assertEqual(report["checks"]["zap_api"], "error")
                    self.assertEqual(report["authentication"], "not_configured")
                    self.assertIsNone(report["deployment_revision"]["commit"])
                    self.assertTrue((review.OUTPUT / "execution-report.html").is_file())
                    self.assertTrue((review.OUTPUT / "sprint-summary.md").is_file())
                    summary = json.loads((review.OUTPUT / "sprint-summary.json").read_text())
                    self.assertEqual(summary["comparison_status"], "incomplete")
            finally:
                os.chdir(old_cwd)

    def test_alerts_are_preserved_without_raw_response_evidence(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(review, "WORK", Path(temp)):
            raw = {"@version": "test", "site": [{"@name": review.TARGET, "alerts": [{"pluginid": "10020", "name": "Missing frame header", "riskcode": "2", "confidence": "2", "desc": "Header absent", "solution": "Review framing policy", "instances": [{"uri": review.TARGET + "/me?secret=example", "evidence": "sensitive response sample"}]}]}]}
            review.write_json(review.WORK / "zap-api.json", raw)
            parsed = review.load_zap("zap-api")
            self.assertEqual(parsed["findings"][0]["severity"], "medium")
            self.assertNotIn("secret=", json.dumps(parsed))
            self.assertNotIn("sensitive response sample", json.dumps(parsed))
            self.assertEqual(parsed["findings"][0]["status"], "scanner_alert_requires_review")


if __name__ == "__main__":
    unittest.main()
