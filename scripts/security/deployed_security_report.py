"""Collect bounded read-only deployment checks and generate review reports."""

import argparse
import copy
import hashlib
import html
import json
import os
import re
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from create_execution_manifest import build_manifest

TARGET = "https://backend-web-ur8z.onrender.com"
OUTPUT = Path("reports/security")
WORK = OUTPUT / ".work"
METHODS = {"get", "post", "put", "patch", "delete", "head", "options", "trace"}
EXCLUDED_GET = {"/api/v1/geocode", "/api/v1/weather/forecast"}
READ_ONLY_PATHS = {
    "/ping", "/docs", "/api/v1/users", "/api/v1/user_profile", "/api/v1/me",
    "/api/v1/fields", "/api/v1/dashboard", "/api/v1/anunces",
    "/api/v1/conte_mercat", "/api/v1/legal/privacy", "/api/v1/legal/security",
}
MAX_BODY = 3_000_000


def now():
    return datetime.now(timezone.utc).isoformat()


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def public_url(value):
    parts = urlsplit(value)
    return f"{parts.scheme}://{parts.netloc}{parts.path}"


def validate_url(url):
    parts = urlsplit(url)
    if (parts.scheme != "https" or parts.netloc != urlsplit(TARGET).netloc
            or parts.username or parts.password):
        raise ValueError("Only the configured HTTPS deployment is in scope")


class DeploymentRedirects(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        validate_url(new_url)
        return super().redirect_request(request, fp, code, message, headers, new_url)


def fetch(url):
    validate_url(url)
    request = Request(url, headers={"User-Agent": "AGRITWIN-Security-Report/1.0"}, method="GET")
    started = time.monotonic()
    try:
        response = build_opener(DeploymentRedirects()).open(request, timeout=25)
    except HTTPError as error:
        response = error
    with response:
        body = response.read(MAX_BODY + 1)
        if len(body) > MAX_BODY:
            raise ValueError("Response exceeds the review size limit")
        return {
            "url": url,
            "final_url": response.geturl(),
            "http_status": response.code,
            "headers": {key.lower(): value for key, value in response.headers.items()},
            "duration_ms": round((time.monotonic() - started) * 1000),
            "body": body,
        }


def readonly_specification(source):
    if not isinstance(source.get("paths"), dict) or not source.get("openapi"):
        raise ValueError("The deployment did not return an OpenAPI document")
    spec = copy.deepcopy(source)
    spec.pop("webhooks", None)
    spec["servers"] = [{"url": TARGET}]
    spec["paths"] = {}
    selected, omitted = [], []
    for path, item in sorted(source["paths"].items()):
        if not isinstance(item, dict):
            continue
        for method in sorted(set(item) & METHODS):
            reason = None
            operation = item[method]
            parameters = item.get("parameters", []) + operation.get("parameters", [])
            if method != "get":
                reason = "Write and non-GET operations are outside this review"
            elif "{" in path or not re.fullmatch(r"/[A-Za-z0-9_./-]*", path) or ".." in path or "//" in path:
                reason = "Resource identifiers are not guessed on a live deployment"
            elif path in EXCLUDED_GET:
                reason = "External-provider requests are excluded"
            elif re.search(r"(?:logout|delete|remove|reset|trigger|revoke)", path, re.I):
                reason = "Potential side-effect route is excluded"
            elif path not in READ_ONLY_PATHS:
                reason = "Route is not in the approved read-only collection"
            elif any(p.get("required") or "$ref" in p for p in parameters):
                reason = "Required input or referenced parameters need explicit review"
            if reason:
                omitted.append({"method": method.upper(), "path": path, "reason": reason})
                continue
            operation = copy.deepcopy(operation)
            operation.pop("servers", None)
            operation.pop("requestBody", None)
            operation.pop("callbacks", None)
            bounded = copy.deepcopy(parameters)
            for parameter in bounded:
                if parameter.get("name") == "limit":
                    parameter["schema"] = {"type": "integer", "minimum": 1, "maximum": 1, "default": 1}
                    parameter["example"] = 1
            operation["parameters"] = bounded
            spec["paths"][path] = {"get": operation}
            selected.append({"method": "GET", "path": path})
    def check_references(value):
        if isinstance(value, dict):
            if "$ref" in value and not value["$ref"].startswith("#/"):
                raise ValueError("External OpenAPI references are excluded")
            for child in value.values():
                check_references(child)
        elif isinstance(value, list):
            for child in value:
                check_references(child)
    check_references(spec)
    return spec, selected, omitted


def prepare():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    report = build_manifest()
    report.update({
        "execution_status": "running",
        "environment": "existing_deployment",
        "target": TARGET,
        "deployment_revision": {"status": "unverified", "commit": None},
        "authentication": "not_configured",
        "scan_policy": "GET only; no active scan, forms, account creation, or database writes",
        "errors": [],
        "observed_endpoints": [],
        "selected_openapi_operations": [],
        "omitted_openapi_operations": [],
        "checks": {
            "environment_setup": "skipped_existing_deployment",
            "openapi": "not_run",
            "readonly_http": "not_run",
            "zap_baseline": "not_run",
            "zap_api": "not_run",
            "authorization_tests": "skipped_no_test_accounts",
            "mqtt": "not_run",
            "sonar": "not_run_in_this_workflow",
            "codeql": "not_run_in_this_workflow",
        },
    })
    try:
        for attempt in range(3):
            try:
                response = fetch(TARGET + "/openapi.json")
                if response["http_status"] != 200:
                    raise ValueError(f"OpenAPI returned HTTP {response['http_status']}")
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(5)
        original = json.loads(response["body"])
        spec, selected, omitted = readonly_specification(original)
        if not selected:
            raise ValueError("No GET operations are eligible for this deployment review")
        report["openapi_sha256"] = hashlib.sha256(response["body"]).hexdigest()
        report["openapi_operation_count"] = len(selected) + len(omitted)
        report["selected_openapi_operations"] = selected
        report["omitted_openapi_operations"] = omitted
        report["checks"]["openapi"] = "completed"
        write_json(WORK / "openapi-readonly.json", spec)
        for item in [{"path": "/docs"}, {"path": "/ping"}] + selected:
            path = item["path"]
            query = "?" + urlencode({"limit": 1}) if path.endswith(("/users", "/user_profile", "/anunces", "/conte_mercat")) else ""
            try:
                observed = fetch(TARGET + path + query)
                report["observed_endpoints"].append({
                    "method": "GET", "path": path,
                    "http_status": observed["http_status"],
                    "duration_ms": observed["duration_ms"],
                    "authentication": "anonymous",
                    "scope": "Response status and headers; ownership not verified",
                    "security_headers": {
                        name: observed["headers"].get(name)
                        for name in ("content-security-policy", "x-frame-options", "x-content-type-options", "strict-transport-security")
                    },
                })
            except Exception as error:
                report["observed_endpoints"].append({"method": "GET", "path": path, "error": type(error).__name__})
        report["checks"]["readonly_http"] = "completed"
    except Exception as error:
        report["checks"]["openapi"] = "error"
        report["errors"].append(f"OpenAPI preparation failed: {type(error).__name__}: {error}")
    write_json(OUTPUT / "manifest.json", report)
    print(f"Prepared review: {len(report['selected_openapi_operations'])} eligible GET operations")


def plain(value):
    return html.unescape(re.sub(r"<[^>]*>", " ", str(value or ""))).strip()


def load_zap(name):
    path = WORK / f"{name}.json"
    if not path.is_file():
        raise ValueError(f"Missing {name} JSON report")
    data = json.loads(path.read_text())
    if not isinstance(data.get("site"), list) or not data["site"]:
        raise ValueError(f"{name} did not report a scanned site")
    findings = []
    for site in data["site"]:
        for alert in site.get("alerts", []):
            instances = alert.get("instances") or [{}]
            for instance in instances:
                uri = public_url(instance.get("uri", site.get("@name", TARGET)))
                parameter = instance.get("param", "")
                key = f"{alert.get('pluginid')}|{uri}|{parameter}"
                findings.append({
                    "id": hashlib.sha256(key.encode()).hexdigest()[:16],
                    "rule_id": str(alert.get("pluginid", "")),
                    "title": plain(alert.get("name") or alert.get("alert")),
                    "severity": {"0": "informational", "1": "low", "2": "medium", "3": "high"}.get(str(alert.get("riskcode")), "unknown"),
                    "confidence": str(alert.get("confidence", "")),
                    "url": uri, "parameter": parameter,
                    "description": plain(alert.get("desc")),
                    "recommendation": plain(alert.get("solution")),
                    "status": "scanner_alert_requires_review",
                    "sources": [name],
                })
    return {"tool_version": data.get("@version", "unknown"), "findings": findings}


def html_report(title, paragraphs, findings):
    esc = html.escape
    rows = "".join(
        f"<tr><td>{esc(f['severity'])}</td><td>{esc(f['title'])}</td><td>{esc(f['url'])}</td>"
        f"<td>{esc(f['description'])}</td><td>{esc(f['recommendation'])}</td></tr>"
        for f in findings
    )
    return (
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">'
        f"<title>{esc(title)}</title><style>body{{font:16px system-ui;margin:2rem;line-height:1.5}}"
        "table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:.6rem;text-align:left;vertical-align:top;overflow-wrap:anywhere}"
        f"</style><h1>{esc(title)}</h1>"
        + "".join(f"<p>{esc(p)}</p>" for p in paragraphs)
        + "<table><thead><tr><th>Severity</th><th>Finding</th><th>URL</th><th>Evidence description</th><th>Suggested correction</th></tr></thead>"
        f"<tbody>{rows}</tbody></table></html>"
    )


def finalize():
    report = json.loads((OUTPUT / "manifest.json").read_text())
    external_path = OUTPUT / "external-analyses.json"
    external = json.loads(external_path.read_text()) if external_path.is_file() else {}
    external_paragraphs = []
    for name in ("sonar", "codeql"):
        entry = external.get(name, {"status": "unavailable", "reason": "No external result was collected"})
        report["checks"][name] = "external_results_available" if entry["status"] == "available" else "external_results_unavailable"
        if entry["status"] != "available":
            external_paragraphs.append(f"{name}: results unavailable. {entry.get('reason', entry['status'])}. This is not a zero-alert result.")
        elif name == "sonar":
            workflow = entry.get("associated_workflow") or {}
            external_paragraphs.append(f"Sonar: branch {entry['analysis_branch']}; quality gate {entry['quality_gate']}; overall vulnerabilities {entry['vulnerabilities']}; rating {entry['security_rating']}; hotspots {entry['security_hotspots']}. Analysis date: {entry.get('analysis_date') or 'unavailable'}. Associated workflow commit: {workflow.get('commit') or 'unavailable'}; server-side revision is not verified.")
        else:
            snapshots = "; ".join(f"{a['category']}: {a['commit']} at {a['created_at']}" for a in entry["latest_analyses"])
            external_paragraphs.append(f"CodeQL: existing weekly results on {entry['analysis_branch']}; open alerts {entry['open_alerts']}. {snapshots}. This workflow did not start a new CodeQL scan.")
    report["external_analyses"] = external
    merged = {}
    for name, check in (("zap-baseline", "zap_baseline"), ("zap-api", "zap_api")):
        exit_file = WORK / f"{name}.exit"
        try:
            code = int(exit_file.read_text().strip())
            if code not in (0, 1, 2):
                raise ValueError(f"Scanner exit code {code}")
            parsed = load_zap(name)
            report["checks"][check] = "completed_with_alerts" if parsed["findings"] else "completed"
            report.setdefault("tools", {})[name] = {"version": parsed["tool_version"], "exit_code": code}
            write_json(OUTPUT / f"{name}.json", parsed)
            (OUTPUT / f"{name}.html").write_text(html_report(
                f"AGRITWIN {name} report",
                [f"Target: {TARGET}", "Passive, anonymous, read-only review. Alerts require evaluation. Raw HTTP bodies and evidence samples are omitted."],
                parsed["findings"],
            ))
            for finding in parsed["findings"]:
                if finding["id"] in merged:
                    if name not in merged[finding["id"]]["sources"]:
                        merged[finding["id"]]["sources"].append(name)
                else:
                    merged[finding["id"]] = finding
        except Exception as error:
            report["checks"][check] = "error"
            report["errors"].append(f"{name}: {type(error).__name__}: {error}")
    report["findings"] = sorted(merged.values(), key=lambda f: (f["severity"], f["id"]))
    report["severity_counts"] = dict(Counter(f["severity"] for f in report["findings"]))
    report["finished_at"] = now()
    probe_errors = any("error" in entry for entry in report["observed_endpoints"])
    report["execution_status"] = "error" if report["errors"] or probe_errors else "completed_with_findings" if merged else "completed"
    digest = WORK / "image-digest.txt"
    report["scanner_image_digest"] = digest.read_text().strip() if digest.is_file() else "not_recorded"
    write_json(OUTPUT / "manifest.json", report)
    write_json(OUTPUT / "execution-report.json", report)
    write_json(OUTPUT / "coverage.json", {
        "openapi_operation_count": report.get("openapi_operation_count"),
        "selected_get_operations": report["selected_openapi_operations"],
        "observed_endpoints": report["observed_endpoints"],
        "omitted_operations": report["omitted_openapi_operations"],
        "limitations": ["Authentication is not configured", "Cross-user permissions and MQTT are not tested", "No active scans or write operations", "Deployed revision is not verified against the source commit"],
    })
    paragraphs = [
        f"Execution: {report['execution_status']}. Source commit: {report['commit']}.",
        f"Deployment: {TARGET}. Deployed commit is unverified; this is not a test instance of the source commit.",
        f"Observed endpoints: {len(report['observed_endpoints'])}. Unique alerts: {len(merged)}.",
        "Anonymous GET-only coverage. No active attacks, form submission, write operations, cross-user permission tests or MQTT tests.",
        "ZAP alerts below are separate from Sonar and CodeQL snapshots. The tools may have analyzed different source revisions.",
    ] + external_paragraphs + report["errors"]
    (OUTPUT / "execution-report.html").write_text(html_report("AGRITWIN security execution report", paragraphs, report["findings"]))
    previous = None
    for path in sorted(Path("reports/previous").rglob("execution-report.json")):
        candidate = json.loads(path.read_text())
        if candidate.get("target") == TARGET and candidate.get("execution_status") != "error":
            previous = candidate
            break
    old_ids = {f["id"] for f in previous.get("findings", [])} if previous else set()
    current_ids = set(merged)
    snapshot = {
        "source_commit": report["commit"], "target": TARGET,
        "baseline_run_id": previous.get("run_id") if previous else None,
        "comparison_status": "compared" if previous and report["execution_status"] != "error" else "incomplete" if report["execution_status"] == "error" else "initial_snapshot",
        "newly_observed": sorted(current_ids - old_ids),
        "still_observed": sorted(current_ids & old_ids),
        "not_observed_again": sorted(old_ids - current_ids) if report["execution_status"] != "error" else [],
        "closure_policy": "Disappearing alerts are not confirmed fixes. Review coverage and retest before closing.",
        "external_analyses": external,
    }
    write_json(OUTPUT / "sprint-summary.json", snapshot)
    lines = ["# AGRITWIN Sprint Security Summary", "", f"- Source commit: `{report['commit']}`", f"- Execution status: {report['execution_status']}", f"- Comparison: {snapshot['comparison_status']}", f"- Previous comparable run: {snapshot['baseline_run_id'] or 'not available'}", f"- Current alert counts: {report['severity_counts']}", f"- Newly observed: {len(snapshot['newly_observed'])}", f"- Still observed: {len(snapshot['still_observed'])}", f"- Not observed again: {len(snapshot['not_observed_again'])}", "", "## Scope and decisions", "", *[f"- {p}" for p in paragraphs], "", "No application fixes are applied. Each alert requires evaluation and a recorded decision.", "Disappearing alerts are not confirmed fixes; compare coverage and verify the deployed revision before closure.", "", "## Current alerts", ""]
    lines.extend(f"- {f['id']} | {f['severity']} | {f['title']} | {f['url']} | review required" for f in report["findings"])
    (OUTPUT / "sprint-summary.md").write_text("\n".join(lines) + "\n")
    summary = os.getenv("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as stream:
            stream.write("\n".join(lines[:16]) + "\n\nDownload the security-report artifact for HTML, JSON and coverage details.\n")
    print(f"Report generated: {report['execution_status']}; {len(merged)} alerts")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("prepare", "finalize", "check"))
    command = parser.parse_args().command
    if command == "prepare":
        prepare()
    elif command == "finalize":
        finalize()
    else:
        report = json.loads((OUTPUT / "manifest.json").read_text())
        return 1 if report["execution_status"] == "error" else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
