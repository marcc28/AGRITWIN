#!/usr/bin/env python3
"""Generate a business cost CSV from GitHub parent issues and Project fields.

Sprint 0 is static. For later sprints, only parent issues whose title contains
``[SPRINT N]`` are shown. Estimated-Hours and Final-Hours are read from the
parent's leaf subissues in the configured GitHub Project and summed into the
parent row.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Any, Iterable


API_VERSION = "2026-03-10"
ZERO = Decimal("0")

CSV_FIELDS = [
    "Sprint", "Task", "EH", "Member", "FH", "Progress",
    "PV (€)", "AC (€)", "EV (€)", "PV - AC (€)", "BAC (€)",
    "CPI", "SPI", "CV (€)", "SV (€)", "EAC (€)", "ETC (€)",
    "VAC (€)",
]

FIELD_ALIASES = {
    "estimated": ["Estimated-Hours", "Estimated Hours", "EH"],
    "final": ["Final-Hours", "Final Hours", "FH"],
}


def normalize_text(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", text).strip().casefold()


def decimal_value(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float, Decimal)):
        return Decimal(str(value))
    match = re.search(r"-?\d+(?:[.,]\d+)?", str(value).replace(" ", ""))
    if not match:
        return None
    try:
        return Decimal(match.group(0).replace(",", "."))
    except InvalidOperation:
        return None


def sprint_from_title(title: str) -> str | None:
    match = re.search(r"\[\s*SPRINT\s*(\d+)\s*\]", title or "", re.IGNORECASE)
    return f"SPRINT {match.group(1)}" if match else None


def clean_parent_title(title: str) -> str:
    return re.sub(r"^\s*\[\s*SPRINT\s*\d+\s*\]\s*", "", title, flags=re.IGNORECASE).strip()


def sprint_sort_key(value: str) -> tuple[int, int, str]:
    match = re.search(r"\d+", value)
    return (0, int(match.group(0)), normalize_text(value)) if match else (1, 0, normalize_text(value))


def blank_row(**values: Any) -> dict[str, Any]:
    row = {field: "" for field in CSV_FIELDS}
    row.update(values)
    return row


def static_sprint_zero_rows(config: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    material_total = ZERO
    for material in config.get("materials", []):
        cost = Decimal(str(material["line_cost_eur"]))
        material_total += cost
        quantity = material.get("quantity", "")
        platform = material.get("platform", "")
        rows.append(blank_row(
            Sprint="SPRINT0", _type="material", Task=material["name"],
            **{"PV (€)": cost},
            Member=f"{quantity} units · {platform}".strip(" ·"),
        ))

    labor = config["labor_budget"]
    hours_per_member = (
        Decimal(str(labor["sprints"]))
        * Decimal(str(labor["weeks_per_sprint"]))
        * Decimal(str(labor["hours_per_week"]))
    )
    rate = Decimal(str(labor["hourly_rate_eur"]))
    labor_total = ZERO
    for member in labor["members"]:
        member_cost = hours_per_member * rate
        labor_total += member_cost
        rows.append(blank_row(
            Sprint="SPRINT0", _type="labor_budget", Task=member,
            EH=hours_per_member, Member=member, **{"PV (€)": member_cost},
        ))

    configured_bac = Decimal(str(config["bac_eur"]))
    calculated_bac = material_total + labor_total
    rows.append(blank_row(
        Sprint="SPRINT0", _type="summary",
        Task="ESTIMATED COST OF THE PROJECT (BAC)",
        **{"PV (€)": calculated_bac, "BAC (€)": configured_bac},
    ))
    return rows


def project_field_value(fields: dict[str, Any], key: str) -> Decimal | None:
    normalized = {normalize_text(name): value for name, value in fields.items()}
    aliases = list(FIELD_ALIASES[key])
    extra = os.getenv(f"COSTS_FIELD_{key.upper()}", "")
    aliases = [item.strip() for item in extra.split(",") if item.strip()] + aliases
    for alias in aliases:
        if normalize_text(alias) in normalized:
            return decimal_value(normalized[normalize_text(alias)])
    return None


def leaf_descendants(parent: dict[str, Any], by_number: dict[int, dict[str, Any]]) -> list[dict[str, Any]]:
    leaves: list[dict[str, Any]] = []
    visited: set[int] = set()

    def visit(issue: dict[str, Any]) -> None:
        number = int(issue["number"])
        if number in visited:
            return
        visited.add(number)
        children = [
            by_number[child_number]
            for child_number in issue.get("subissue_numbers", [])
            if child_number in by_number
        ]
        if not children:
            if issue is not parent:
                leaves.append(issue)
            return
        for child in children:
            visit(child)

    visit(parent)
    return leaves


def parent_task_row(parent: dict[str, Any], leaves: list[dict[str, Any]], hourly_rate: Decimal) -> dict[str, Any]:
    estimated = ZERO
    final = ZERO
    missing_estimated = 0
    missing_final = 0
    members: list[str] = []
    closed_children = 0

    for child in leaves:
        fields = child.get("project_fields") or {}
        child_estimated = project_field_value(fields, "estimated")
        child_final = project_field_value(fields, "final")
        if child_estimated is None:
            missing_estimated += 1
        else:
            estimated += child_estimated
        if child_final is None:
            missing_final += 1
        else:
            final += child_final
        if normalize_text(child.get("state")) == "closed":
            closed_children += 1
        for assignee in child.get("assignees") or []:
            login = assignee.get("login", "") if isinstance(assignee, dict) else str(assignee)
            if login and login not in members:
                members.append(login)

    if normalize_text(parent.get("state")) == "closed":
        progress = Decimal("1")
    elif leaves:
        progress = Decimal(closed_children) / Decimal(len(leaves))
    else:
        progress = ZERO

    pv = estimated * hourly_rate
    ac = final * hourly_rate
    ev = pv * progress
    return blank_row(
        Sprint=sprint_from_title(parent.get("title", "")) or "NO SPRINT",
        _type="task", Task=clean_parent_title(parent.get("title", "")),
        EH=estimated, Member=" & ".join(members), FH=final, Progress=progress,
        **{"PV (€)": pv, "AC (€)": ac, "EV (€)": ev, "PV - AC (€)": pv - ac},
    )


def summary_row(sprint: str, task_rows: list[dict[str, Any]], bac: Decimal) -> dict[str, Any]:
    eh = sum((Decimal(str(row["EH"])) for row in task_rows), start=ZERO)
    fh = sum((Decimal(str(row["FH"])) for row in task_rows), start=ZERO)
    pv = sum((Decimal(str(row["PV (€)"])) for row in task_rows), start=ZERO)
    ac = sum((Decimal(str(row["AC (€)"])) for row in task_rows), start=ZERO)
    ev = sum((Decimal(str(row["EV (€)"])) for row in task_rows), start=ZERO)
    cpi = ev / ac if ac else None
    spi = ev / pv if pv else None
    eac = bac / cpi if cpi else None
    return blank_row(
        Sprint=sprint, _type="summary", Task=f"TOTAL {sprint}", EH=eh, FH=fh,
        **{
            "PV (€)": pv, "AC (€)": ac, "EV (€)": ev, "PV - AC (€)": pv - ac,
            "BAC (€)": bac, "CPI": cpi, "SPI": spi, "CV (€)": ev - ac,
            "SV (€)": ev - pv, "EAC (€)": eac,
            "ETC (€)": eac - ac if eac is not None else None,
            "VAC (€)": bac - eac if eac is not None else None,
        },
    )


def build_rows(config: dict[str, Any], issues: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    issues = list(issues)
    by_number = {int(issue["number"]): issue for issue in issues}
    hourly_rate = Decimal(str(config["default_hourly_rate_eur"]))
    parents = [issue for issue in issues if sprint_from_title(issue.get("title", ""))]

    rows = static_sprint_zero_rows(config)
    task_rows: list[dict[str, Any]] = []
    for parent in parents:
        sprint = sprint_from_title(parent.get("title", ""))
        if sprint == "SPRINT 0":
            continue
        leaves = leaf_descendants(parent, by_number)
        task_rows.append(parent_task_row(parent, leaves, hourly_rate))

    task_rows.sort(key=lambda row: (sprint_sort_key(str(row["Sprint"])), normalize_text(row["Task"])))
    rows.extend(task_rows)
    by_sprint: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in task_rows:
        by_sprint[str(row["Sprint"])].append(row)
    bac = Decimal(str(config["bac_eur"]))
    for sprint in sorted(by_sprint, key=sprint_sort_key):
        rows.append(summary_row(sprint, by_sprint[sprint], bac))
    return rows


def api_request(url: str, token: str, *, payload: dict[str, Any] | None = None) -> Any:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        url, data=data,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": API_VERSION,
            "User-Agent": "project-costs-action",
            "Content-Type": "application/json",
        },
        method="POST" if payload is not None else "GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub API returned HTTP {error.code}: {body}") from error


def fetch_repository_issues(repository: str, token: str) -> list[dict[str, Any]]:
    owner, repo = repository.split("/", 1)
    issues: list[dict[str, Any]] = []
    for page in range(1, 101):
        query = urllib.parse.urlencode({"state": "all", "per_page": 100, "page": page})
        batch = api_request(f"https://api.github.com/repos/{owner}/{repo}/issues?{query}", token)
        for issue in batch:
            if "pull_request" in issue:
                continue
            issue["subissue_numbers"] = []
            for subissue_page in range(1, 101):
                subissues = api_request(
                    f"https://api.github.com/repos/{owner}/{repo}/issues/{issue['number']}"
                    f"/sub_issues?per_page=100&page={subissue_page}", token,
                )
                issue["subissue_numbers"].extend(int(child["number"]) for child in subissues)
                if len(subissues) < 100:
                    break
            issues.append(issue)
        if len(batch) < 100:
            break
    return issues


PROJECT_FIELDS_QUERY = """
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      projectItems(first: 50) {
        nodes {
          project { title }
          fieldValues(first: 100) {
            nodes {
              ... on ProjectV2ItemFieldNumberValue {
                number
                field { ... on ProjectV2FieldCommon { name } }
              }
              ... on ProjectV2ItemFieldTextValue {
                text
                field { ... on ProjectV2FieldCommon { name } }
              }
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2FieldCommon { name } }
              }
            }
          }
        }
      }
    }
  }
}
"""


def normalize_project_fields(nodes: Iterable[dict[str, Any]]) -> dict[str, Any]:
    fields: dict[str, Any] = {}
    for node in nodes:
        name = (node.get("field") or {}).get("name")
        if not name:
            continue
        for key in ("number", "text", "name"):
            if node.get(key) not in (None, ""):
                fields[name] = node[key]
                break
    return fields


def fetch_issue_project_fields(repository: str, issue_number: int, token: str, project_title: str) -> dict[str, Any]:
    owner, repo = repository.split("/", 1)
    result = api_request(
        "https://api.github.com/graphql", token,
        payload={
            "query": PROJECT_FIELDS_QUERY,
            "variables": {"owner": owner, "repo": repo, "number": issue_number},
        },
    )
    if result.get("errors"):
        raise RuntimeError(f"GitHub GraphQL error: {json.dumps(result['errors'], ensure_ascii=False)}")
    issue = (((result.get("data") or {}).get("repository") or {}).get("issue") or {})
    for item in (issue.get("projectItems") or {}).get("nodes", []):
        title = (item.get("project") or {}).get("title", "")
        if normalize_text(title) == normalize_text(project_title):
            return normalize_project_fields((item.get("fieldValues") or {}).get("nodes", []))
    return {}


def load_github_data(repository: str, repo_token: str, projects_token: str, project_title: str) -> list[dict[str, Any]]:
    issues = fetch_repository_issues(repository, repo_token)
    by_number = {int(issue["number"]): issue for issue in issues}
    leaf_numbers: set[int] = set()
    for parent in issues:
        if not sprint_from_title(parent.get("title", "")):
            continue
        for leaf in leaf_descendants(parent, by_number):
            leaf_numbers.add(int(leaf["number"]))

    for number in sorted(leaf_numbers):
        by_number[number]["project_fields"] = fetch_issue_project_fields(
            repository, number, projects_token, project_title,
        )

    if leaf_numbers and not any(by_number[number].get("project_fields") for number in leaf_numbers):
        raise RuntimeError(
            f"No se encontraron campos personalizados en los subissues del Project '{project_title}'. "
            "Comprueba PROJECT_TITLE, que los subissues estén añadidos al Project y que "
            "PROJECTS_TOKEN tenga el permiso read:project."
        )
    return issues


def format_value(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, Decimal):
        if value == value.to_integral():
            return str(value.quantize(Decimal("1")))
        rendered = format(value.quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP), "f")
        return rendered.rstrip("0").rstrip(".")
    return value


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            rendered = {key: format_value(row.get(key, "")) for key in CSV_FIELDS}
            if row.get("Progress") != "":
                progress = Decimal(str(row["Progress"])) * Decimal("100")
                rendered["Progress"] = f"{format_value(progress)}%"
            writer.writerow(rendered)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default=os.getenv("SPRINT0_CONFIG", "costs/sprint0.json"))
    parser.add_argument("--output", default=os.getenv("OUTPUT_CSV", "reports/costes.csv"))
    parser.add_argument("--issues-json", help="Local fixture; avoids GitHub API calls")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    if args.issues_json:
        issues = json.loads(Path(args.issues_json).read_text(encoding="utf-8"))
    else:
        repository = os.getenv("GITHUB_REPOSITORY", "")
        repo_token = os.getenv("GITHUB_TOKEN", "")
        projects_token = os.getenv("PROJECTS_TOKEN", "")
        project_title = os.getenv("PROJECT_TITLE", "AGRITWIN")
        if not repository or not repo_token:
            raise RuntimeError("GITHUB_REPOSITORY and GITHUB_TOKEN are required")
        if not projects_token:
            raise RuntimeError("PROJECTS_TOKEN is required to read Project custom fields")
        issues = load_github_data(repository, repo_token, projects_token, project_title)

    rows = build_rows(config, issues)
    output = Path(args.output)
    write_csv(output, rows)
    task_count = sum(row.get("_type") == "task" for row in rows)
    print(f"CSV generated: {output} ({task_count} parent tasks; subissues aggregated and hidden)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1)
