"""Ensure unavailable analyses are not reported as clean security results."""

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import collect_analysis_results as collector


class ExistingAnalysisTests(unittest.TestCase):
    def test_no_codeql_analysis_is_unavailable_not_zero_alerts(self):
        with patch.object(collector, "github", return_value=[]):
            with self.assertRaises(collector.DataUnavailable):
                collector.collect_codeql("owner/repository")

    def test_weekly_codeql_retains_old_revision_and_zero_confirmed_count(self):
        analyses = [{"category": "python", "commit_sha": "old-commit", "created_at": "2026-11-04T06:00:00Z", "tool": {"version": "test"}}]
        with patch.object(collector, "github", side_effect=[analyses, []]), patch.object(collector, "workflow_snapshot", return_value=None):
            result = collector.collect_codeql("owner/repository")
        self.assertEqual(result["status"], "available")
        self.assertEqual(result["open_alerts"], 0)
        self.assertEqual(result["latest_analyses"][0]["commit"], "old-commit")
        self.assertIn("no scan is started", result["execution_policy"])

    def test_failed_codeql_analysis_is_not_clean(self):
        analyses = [{"category": "python", "commit_sha": "old-commit", "created_at": "2026-11-04T06:00:00Z", "error": "Analysis failed"}]
        with patch.object(collector, "github", side_effect=[analyses, []]), patch.object(collector, "workflow_snapshot", return_value=None):
            result = collector.collect_codeql("owner/repository")
        self.assertEqual(result["status"], "analysis_errors")

    def test_missing_sonar_measures_are_not_assumed_zero(self):
        responses = [{"projectStatus": {"status": "OK"}}, {"component": {"measures": []}}]
        with patch.object(collector, "sonar", side_effect=responses):
            with self.assertRaises(collector.DataUnavailable):
                collector.collect_sonar("owner/repository", "feature")

    def test_sonar_preserves_gate_failure_and_overall_scope(self):
        responses = [
            {"projectStatus": {"status": "ERROR"}},
            {"component": {"measures": [{"metric": "vulnerabilities", "value": "2"}, {"metric": "security_rating", "value": "3.0"}, {"metric": "security_hotspots", "value": "1"}]}},
            {"branches": [{"name": "feature", "analysisDate": "2026-11-09T17:00:00Z"}]},
        ]
        with patch.object(collector, "sonar", side_effect=responses), patch.object(collector, "workflow_snapshot", return_value=None):
            result = collector.collect_sonar("owner/repository", "feature")
        self.assertEqual(result["quality_gate"], "ERROR")
        self.assertEqual(result["security_rating"], "C")
        self.assertEqual(result["vulnerabilities"], 2)
        self.assertIn("overall", result["measure_scope"])
        self.assertIn("unverified", result["analysis_revision_status"])


if __name__ == "__main__":
    unittest.main()
