"""Read existing Sonar and CodeQL results without starting new analyses."""

import json
import os
import re
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SONAR_HOST = "https://sonarcloud.io"
SONAR_PROJECT = "marcc28_AGRITWIN"
DEFAULT_BRANCH = "dev"
OUTPUT = Path("reports/security/external-analyses.json")


class DataUnavailable(Exception):
    pass


def github(endpoint, paginate=False):
    args = ["gh", "api"]
    if paginate:
        args.extend(["--paginate", "--slurp"])
    result = subprocess.run(args + [endpoint], capture_output=True, text=True, timeout=60)
    if result.returncode:
        status = re.search(r"HTTP \d{3}", result.stderr)
        raise DataUnavailable(f"GitHub data unavailable ({status.group() if status else 'request failed'})")
    data = json.loads(result.stdout)
    return [item for page in data for item in page] if paginate else data


def sonar(endpoint, parameters):
    request = Request(SONAR_HOST + endpoint + "?" + urlencode(parameters), method="GET")
    try:
        with urlopen(request, timeout=20) as response:
            body = response.read(2_000_001)
            if len(body) > 2_000_000:
                raise DataUnavailable("Sonar response exceeded the size limit")
            return json.loads(body)
    except HTTPError as error:
        raise DataUnavailable(f"Sonar data unavailable (HTTP {error.code})") from error


def workflow_snapshot(repository, filename, branch):
    query = urlencode({"branch": branch, "status": "success", "per_page": 1})
    runs = github(f"repos/{repository}/actions/workflows/{filename}/runs?{query}").get("workflow_runs", [])
    if not runs:
        return None
    run = runs[0]
    return {
        "run_id": run["id"], "url": run["html_url"],
        "commit": run["head_sha"], "branch": run["head_branch"],
        "event": run["event"], "finished_at": run["updated_at"],
    }


def collect_sonar(repository, requested_branch):
    selected_branch = requested_branch
    try:
        gate = sonar("/api/qualitygates/project_status", {"projectKey": SONAR_PROJECT, "branch": selected_branch})
    except DataUnavailable as error:
        if requested_branch == DEFAULT_BRANCH or "HTTP 404" not in str(error):
            raise
        selected_branch = DEFAULT_BRANCH
        gate = sonar("/api/qualitygates/project_status", {"projectKey": SONAR_PROJECT, "branch": selected_branch})
    measures = sonar("/api/measures/component", {
        "component": SONAR_PROJECT, "branch": selected_branch,
        "metricKeys": "vulnerabilities,security_rating,security_hotspots,security_hotspots_reviewed",
    })
    values = {m["metric"]: m.get("value") for m in measures["component"].get("measures", [])}
    required = {"vulnerabilities", "security_rating", "security_hotspots"}
    if not required <= values.keys():
        raise DataUnavailable("Sonar did not return all required overall security measures")
    result = {
        "status": "available", "project": SONAR_PROJECT,
        "requested_branch": requested_branch, "analysis_branch": selected_branch,
        "fallback_to_default_branch": selected_branch != requested_branch,
        "quality_gate": gate["projectStatus"]["status"],
        "measure_scope": "overall branch measures; quality gate may evaluate new-code conditions",
        "vulnerabilities": int(values["vulnerabilities"]),
        "security_rating": {"1.0": "A", "2.0": "B", "3.0": "C", "4.0": "D", "5.0": "E", "1": "A", "2": "B", "3": "C", "4": "D", "5": "E"}.get(values["security_rating"], values["security_rating"]),
        "security_hotspots": int(values["security_hotspots"]),
        "hotspots_reviewed_percent": values.get("security_hotspots_reviewed"),
        "url": SONAR_HOST + "/dashboard?" + urlencode({"id": SONAR_PROJECT, "branch": selected_branch}),
        "analysis_revision_status": "unverified; associated workflow revision is recorded separately",
    }
    try:
        branches = sonar("/api/project_branches/list", {"project": SONAR_PROJECT}).get("branches", [])
        result["analysis_date"] = next((b.get("analysisDate") for b in branches if b.get("name") == selected_branch), None)
    except DataUnavailable:
        result["analysis_date"] = None
    try:
        result["associated_workflow"] = workflow_snapshot(repository, "sonarqube.yml", selected_branch)
    except DataUnavailable:
        result["associated_workflow"] = None
    return result


def collect_codeql(repository):
    query = urlencode({"ref": f"refs/heads/{DEFAULT_BRANCH}", "tool_name": "CodeQL", "per_page": 100})
    analyses = github(f"repos/{repository}/code-scanning/analyses?{query}")
    selected = {}
    for analysis in sorted(analyses, key=lambda a: a.get("created_at", ""), reverse=True):
        category = analysis.get("category") or analysis.get("analysis_key") or "unspecified"
        if category not in selected:
            selected[category] = {
                "category": category, "commit": analysis.get("commit_sha"),
                "created_at": analysis.get("created_at"),
                "error": analysis.get("error", ""), "warning": analysis.get("warning", ""),
                "tool_version": analysis.get("tool", {}).get("version"),
            }
    if not selected:
        raise DataUnavailable("No existing CodeQL analysis was returned for the default branch")
    alerts_query = urlencode({"state": "open", "ref": f"refs/heads/{DEFAULT_BRANCH}", "per_page": 100})
    alerts = github(f"repos/{repository}/code-scanning/alerts?{alerts_query}", paginate=True)
    alerts = [a for a in alerts if a.get("tool", {}).get("name") == "CodeQL"]
    result = {
        "status": "available", "analysis_branch": DEFAULT_BRANCH,
        "execution_policy": "Existing weekly analysis only; no scan is started by this report",
        "alert_scope": "Open alerts for the branch at collection time, not a historical commit snapshot",
        "open_alerts": len(alerts),
        "severity_counts": dict(Counter(a["rule"].get("security_severity_level") or a["rule"].get("severity", "unknown") for a in alerts)),
        "latest_analyses": list(selected.values()),
        "url": f"https://github.com/{repository}/security/code-scanning",
    }
    if any(a["error"] for a in selected.values()):
        result["status"] = "analysis_errors"
    try:
        result["associated_workflow"] = workflow_snapshot(repository, "codeql.yml", DEFAULT_BRANCH)
    except DataUnavailable:
        result["associated_workflow"] = None
    return result


def main():
    repository = os.getenv("GITHUB_REPOSITORY", "marcc28/AGRITWIN")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError("Invalid repository identifier")
    branch = os.getenv("REVIEW_BRANCH") or os.getenv("GITHUB_HEAD_REF") or os.getenv("GITHUB_REF_NAME") or "security/128-api-security"
    report = {"collected_at": datetime.now(timezone.utc).isoformat(), "repository": repository}
    for name, collect in (("sonar", lambda: collect_sonar(repository, branch)), ("codeql", lambda: collect_codeql(repository))):
        try:
            report[name] = collect()
        except Exception as error:
            report[name] = {"status": "unavailable", "reason": str(error), "counts": None}
        print(f"{name}: {report[name]['status']}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
