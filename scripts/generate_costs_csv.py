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
import zipfile
from collections import defaultdict
from copy import copy
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from io import BytesIO
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


def descendants(
    parent: dict[str, Any],
    by_number: dict[int, dict[str, Any]],
    *,
    leaves_only: bool = False,
) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
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
            if leaves_only and issue is not parent:
                result.append(issue)
            return
        for child in children:
            if not leaves_only:
                result.append(child)
            visit(child)

    visit(parent)
    return result


def leaf_descendants(parent: dict[str, Any], by_number: dict[int, dict[str, Any]]) -> list[dict[str, Any]]:
    return descendants(parent, by_number, leaves_only=True)


def parent_task_row(
    parent: dict[str, Any],
    aggregated_issues: list[dict[str, Any]],
    progress_leaves: list[dict[str, Any]],
    hourly_rate: Decimal,
) -> dict[str, Any]:
    estimated = ZERO
    final = ZERO
    members: list[str] = []
    closed_children = 0

    for issue in aggregated_issues:
        fields = issue.get("project_fields") or {}
        issue_estimated = project_field_value(fields, "estimated")
        issue_final = project_field_value(fields, "final")
        if issue_estimated is not None:
            estimated += issue_estimated
        if issue_final is not None:
            final += issue_final
        for assignee in issue.get("assignees") or []:
            login = assignee.get("login", "") if isinstance(assignee, dict) else str(assignee)
            if login and login not in members:
                members.append(login)

    for child in progress_leaves:
        if normalize_text(child.get("state")) == "closed":
            closed_children += 1

    if normalize_text(parent.get("state")) == "closed":
        progress = Decimal("1")
    elif progress_leaves:
        progress = Decimal(closed_children) / Decimal(len(progress_leaves))
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
        children = descendants(parent, by_number)
        leaves = leaf_descendants(parent, by_number)
        task_rows.append(parent_task_row(parent, [parent, *children], leaves, hourly_rate))

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
    relevant_numbers: set[int] = set()
    for parent in issues:
        if not sprint_from_title(parent.get("title", "")):
            continue
        relevant_numbers.add(int(parent["number"]))
        for child in descendants(parent, by_number):
            relevant_numbers.add(int(child["number"]))

    for number in sorted(relevant_numbers):
        by_number[number]["project_fields"] = fetch_issue_project_fields(
            repository, number, projects_token, project_title,
        )

    if relevant_numbers and not any(by_number[number].get("project_fields") for number in relevant_numbers):
        raise RuntimeError(
            f"No se encontraron campos personalizados en las tareas del Project '{project_title}'. "
            "Comprueba PROJECT_TITLE, que las tareas estén añadidas al Project y que "
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


def write_xlsx(path: Path, rows: list[dict[str, Any]], config: dict[str, Any]) -> None:
    """Create an Excel workbook with one clear, formatted sheet per sprint."""
    try:
        from openpyxl import Workbook
        from openpyxl.formatting.rule import DataBarRule
        from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    except ImportError as error:
        raise RuntimeError("openpyxl is required to generate reports/costes.xlsx") from error

    navy = "1F4E78"
    blue = "4472C4"
    light_blue = "D9EAF7"
    pale_blue = "EAF2F8"
    light_green = "E2F0D9"
    light_yellow = "FFF2CC"
    white = "FFFFFF"
    dark = "1F1F1F"
    gray = "D9E1F2"
    thin_gray = Side(style="thin", color="D9E2F3")
    bottom_blue = Border(bottom=Side(style="medium", color=navy))
    currency_format = '€#,##0.00;[Red]-€#,##0.00;–'
    number_format = '#,##0.00;[Red]-#,##0.00;–'
    percent_format = '0%'
    ratio_format = '0.00'

    def base_sheet(ws: Any, title: str, end_column: int) -> None:
        ws.sheet_view.showGridLines = False
        ws.merge_cells(start_row=1, start_column=1, end_row=2, end_column=end_column)
        cell = ws.cell(1, 1, title)
        cell.fill = PatternFill("solid", fgColor=navy)
        cell.font = Font(name="Arial", size=16, bold=True, color=white)
        cell.alignment = Alignment(horizontal="left", vertical="center")
        for row in ws.iter_rows(min_row=1, max_row=2, min_col=1, max_col=end_column):
            for current in row:
                current.fill = PatternFill("solid", fgColor=navy)
        ws.row_dimensions[1].height = 24
        ws.row_dimensions[2].height = 8
        ws.sheet_properties.pageSetUpPr.fitToPage = True
        ws.page_setup.orientation = "landscape"
        ws.page_setup.fitToWidth = 1
        ws.page_setup.fitToHeight = 0
        ws.sheet_properties.tabColor = blue

    def section_title(ws: Any, row: int, title: str, end_column: int) -> None:
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=end_column)
        cell = ws.cell(row, 1, title)
        cell.fill = PatternFill("solid", fgColor=blue)
        cell.font = Font(name="Arial", size=11, bold=True, color=white)
        cell.alignment = Alignment(horizontal="left", vertical="center")
        for column in range(1, end_column + 1):
            ws.cell(row, column).fill = PatternFill("solid", fgColor=blue)
        ws.row_dimensions[row].height = 22

    def table_header(ws: Any, row: int, headers: list[str]) -> None:
        for column, header in enumerate(headers, start=1):
            cell = ws.cell(row, column, header)
            cell.fill = PatternFill("solid", fgColor=navy)
            cell.font = Font(name="Arial", size=10, bold=True, color=white)
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = Border(left=thin_gray, right=thin_gray)
        ws.row_dimensions[row].height = 22

    def write_sprint_zero(ws: Any) -> None:
        base_sheet(ws, "ESTIMATED COST OF THE PROJECT (BAC)", 4)
        ws.merge_cells("E1:E2")
        ws.merge_cells("F1:F2")
        ws["E1"] = "BAC"
        ws["E1"].fill = PatternFill("solid", fgColor=navy)
        ws["E1"].font = Font(name="Arial", size=10, bold=True, color=white)
        ws["E1"].alignment = Alignment(horizontal="center", vertical="center")
        ws["F1"] = float(Decimal(str(config["bac_eur"])))
        ws["F1"].fill = PatternFill("solid", fgColor=navy)
        ws["F1"].font = Font(name="Arial", size=14, bold=True, color=white)
        ws["F1"].alignment = Alignment(horizontal="center", vertical="center")
        ws["F1"].number_format = currency_format

        section_title(ws, 4, "IoT components", 4)
        table_header(ws, 5, ["Component", "Cost", "Platform", "Observations"])
        row = 6
        material_total = ZERO
        for material in config.get("materials", []):
            cost = Decimal(str(material["line_cost_eur"]))
            material_total += cost
            values = [
                material["name"], float(cost), material.get("platform", ""),
                f"{material.get('quantity', '')} units",
            ]
            for column, value in enumerate(values, start=1):
                ws.cell(row, column, value)
            ws.cell(row, 2).number_format = currency_format
            row += 1
        ws.cell(row, 1, "TOTAL")
        ws.cell(row, 2, float(material_total))
        ws.cell(row, 2).number_format = currency_format
        for cell in ws[row][:4]:
            cell.font = Font(name="Arial", size=10, bold=True, color=dark)
            cell.fill = PatternFill("solid", fgColor=light_blue)
            cell.border = bottom_blue

        labor_start = row + 3
        section_title(ws, labor_start, "Working hours budget", 4)
        table_header(ws, labor_start + 1, ["Member", "€ / hour", "Calculation", "Total cost"])
        labor = config["labor_budget"]
        rate = Decimal(str(labor["hourly_rate_eur"]))
        hours = (
            Decimal(str(labor["sprints"]))
            * Decimal(str(labor["weeks_per_sprint"]))
            * Decimal(str(labor["hours_per_week"]))
        )
        row = labor_start + 2
        labor_total = ZERO
        for member in labor["members"]:
            cost = hours * rate
            labor_total += cost
            values = [
                member, float(rate),
                f"{labor['sprints']} × {labor['weeks_per_sprint']} × {labor['hours_per_week']}",
                float(cost),
            ]
            for column, value in enumerate(values, start=1):
                ws.cell(row, column, value)
            ws.cell(row, 2).number_format = currency_format
            ws.cell(row, 4).number_format = currency_format
            row += 1
        ws.cell(row, 1, "TOTAL")
        ws.cell(row, 4, float(labor_total))
        ws.cell(row, 4).number_format = currency_format
        for cell in ws[row][:4]:
            cell.font = Font(name="Arial", size=10, bold=True, color=dark)
            cell.fill = PatternFill("solid", fgColor=light_blue)
            cell.border = bottom_blue

        for current_row in ws.iter_rows(min_row=4, max_row=row, min_col=1, max_col=4):
            for cell in current_row:
                updated_font = copy(cell.font)
                updated_font.name = "Arial"
                updated_font.sz = 10
                cell.font = updated_font
                cell.alignment = Alignment(vertical="center")
        ws.column_dimensions["A"].width = 30
        ws.column_dimensions["B"].width = 16
        ws.column_dimensions["C"].width = 22
        ws.column_dimensions["D"].width = 24
        ws.column_dimensions["E"].width = 12
        ws.column_dimensions["F"].width = 18
        ws.freeze_panes = "A6"
        ws.print_area = f"A1:F{row}"

    def metric_meaning(metric: str, value: Any) -> str:
        if value is None:
            return "Not available"
        numeric = Decimal(str(value))
        if metric == "CPI":
            return "Cost efficient" if numeric >= 1 else "Cost overrun"
        if metric == "SPI":
            return "On or ahead of plan" if numeric >= 1 else "Behind plan"
        return "Favourable" if numeric >= 0 else "Unfavourable"

    def write_sprint_sheet(ws: Any, sprint: str, task_rows: list[dict[str, Any]], summary: dict[str, Any]) -> None:
        base_sheet(ws, f"COST CONTROL - {sprint}", 10)
        section_title(ws, 4, "Main cost values", 10)
        kpis = [
            ("BAC", summary.get("BAC (€)")),
            ("PV", summary.get("PV (€)")),
            ("AC", summary.get("AC (€)")),
            ("EV", summary.get("EV (€)")),
            ("PV - AC", summary.get("PV - AC (€)")),
        ]
        for index, (label, value) in enumerate(kpis):
            label_cell = ws.cell(5, index * 2 + 1, label)
            value_cell = ws.cell(5, index * 2 + 2, float(value) if value not in (None, "") else None)
            label_cell.fill = PatternFill("solid", fgColor=light_blue)
            label_cell.font = Font(name="Arial", size=10, bold=True, color=navy)
            label_cell.alignment = Alignment(horizontal="center")
            value_cell.fill = PatternFill("solid", fgColor=pale_blue)
            value_cell.font = Font(name="Arial", size=11, bold=True, color=dark)
            value_cell.alignment = Alignment(horizontal="right")
            value_cell.number_format = currency_format
        ws.row_dimensions[5].height = 26

        section_title(ws, 7, "Tasks", 8)
        headers = ["Task", "EH", "Member", "FH", "Progress", "PV (€)", "AC (€)", "EV (€)"]
        table_header(ws, 8, headers)
        row = 9
        for task in task_rows:
            values = [
                task["Task"], float(task["EH"]), task["Member"], float(task["FH"]),
                float(task["Progress"]), float(task["PV (€)"]), float(task["AC (€)"]),
                float(task["EV (€)"]),
            ]
            for column, value in enumerate(values, start=1):
                cell = ws.cell(row, column, value)
                cell.font = Font(name="Arial", size=10, color=dark)
                cell.alignment = Alignment(vertical="center", wrap_text=column in (1, 3))
                cell.border = Border(left=thin_gray, right=thin_gray, bottom=thin_gray)
                if row % 2 == 0:
                    cell.fill = PatternFill("solid", fgColor="F7FAFC")
            ws.cell(row, 2).alignment = Alignment(horizontal="right", vertical="center")
            ws.cell(row, 3).alignment = Alignment(horizontal="center", vertical="center")
            ws.cell(row, 4).alignment = Alignment(horizontal="right", vertical="center")
            ws.cell(row, 2).number_format = number_format
            ws.cell(row, 4).number_format = number_format
            ws.cell(row, 5).number_format = percent_format
            for column in (6, 7, 8):
                ws.cell(row, column).number_format = currency_format
            row += 1

        total_row = row
        total_values = [
            f"TOTAL {sprint}", float(summary["EH"]), "", float(summary["FH"]), "",
            float(summary["PV (€)"]), float(summary["AC (€)"]), float(summary["EV (€)"]),
        ]
        for column, value in enumerate(total_values, start=1):
            cell = ws.cell(total_row, column, value)
            cell.font = Font(name="Arial", size=10, bold=True, color=dark)
            cell.fill = PatternFill("solid", fgColor=light_blue)
            cell.border = bottom_blue
        ws.cell(total_row, 2).number_format = number_format
        ws.cell(total_row, 4).number_format = number_format
        for column in (6, 7, 8):
            ws.cell(total_row, column).number_format = currency_format
        if task_rows:
            ws.auto_filter.ref = f"A8:H{total_row - 1}"
            ws.conditional_formatting.add(
                f"E9:E{total_row - 1}",
                DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color=blue),
            )

        performance_title = total_row + 3
        section_title(ws, performance_title, "Performance", 4)
        table_header(ws, performance_title + 1, ["Metric", "Calculation", "Value", "Interpretation"])
        performance = [
            ("CPI", "EV / AC", summary.get("CPI")),
            ("SPI", "EV / PV", summary.get("SPI")),
            ("CV", "EV - AC", summary.get("CV (€)")),
            ("SV", "EV - PV", summary.get("SV (€)")),
        ]
        performance_data_start = performance_title + 2
        row = performance_data_start
        for metric, formula, value in performance:
            ws.cell(row, 1, metric)
            ws.cell(row, 2, formula)
            ws.cell(row, 3, float(value) if value is not None else None)
            ws.cell(row, 4, metric_meaning(metric, value))
            ws.cell(row, 3).number_format = ratio_format if metric in ("CPI", "SPI") else currency_format
            row += 1
        performance_data_end = row - 1

        forecast_title = row + 2
        section_title(ws, forecast_title, "Forecast", 4)
        table_header(ws, forecast_title + 1, ["Metric", "Calculation", "Value", "Meaning"])
        forecasts = [
            ("EAC", "BAC / CPI", summary.get("EAC (€)"), "Estimated total cost"),
            ("ETC", "EAC - AC", summary.get("ETC (€)"), "Estimated remaining cost"),
            ("VAC", "BAC - EAC", summary.get("VAC (€)"), "Expected budget variance"),
        ]
        forecast_data_start = forecast_title + 2
        row = forecast_data_start
        for metric, formula, value, meaning in forecasts:
            ws.cell(row, 1, metric)
            ws.cell(row, 2, formula)
            ws.cell(row, 3, float(value) if value is not None else None)
            ws.cell(row, 4, meaning)
            ws.cell(row, 3).number_format = currency_format
            row += 1
        forecast_data_end = row - 1

        for current_row in ws.iter_rows(min_row=performance_data_start, max_row=performance_data_end, min_col=1, max_col=4):
            for cell in current_row:
                cell.font = Font(name="Arial", size=10, color=dark, italic=cell.column == 1)
                cell.alignment = Alignment(vertical="center")
            value = current_row[2].value
            if value is not None and isinstance(value, (int, float)):
                metric = current_row[0].value
                favourable = value >= 1 if metric in ("CPI", "SPI") else value >= 0
                current_row[2].fill = PatternFill(
                    "solid", fgColor=light_green if favourable else "FCE4D6"
                )

        for current_row in ws.iter_rows(min_row=forecast_data_start, max_row=forecast_data_end, min_col=1, max_col=4):
            for cell in current_row:
                cell.font = Font(name="Arial", size=10, color=dark, italic=cell.column == 1)
                cell.alignment = Alignment(vertical="center")
            current_row[2].fill = PatternFill("solid", fgColor=light_yellow)
            if current_row[0].value == "VAC" and isinstance(current_row[2].value, (int, float)):
                current_row[2].fill = PatternFill(
                    "solid", fgColor=light_green if current_row[2].value >= 0 else "FCE4D6"
                )

        widths = {"A": 34, "B": 14, "C": 24, "D": 14, "E": 14, "F": 16, "G": 16, "H": 16, "I": 14, "J": 18}
        for column, width in widths.items():
            ws.column_dimensions[column].width = width
        ws.freeze_panes = "A9"
        ws.print_title_rows = "1:8"
        ws.print_area = f"A1:J{row - 1}"

    workbook = Workbook()
    workbook.remove(workbook.active)
    sprint_zero = workbook.create_sheet("SPRINT0")
    write_sprint_zero(sprint_zero)

    by_sprint: dict[str, list[dict[str, Any]]] = defaultdict(list)
    summaries: dict[str, dict[str, Any]] = {}
    for row in rows:
        if row.get("_type") == "task":
            by_sprint[str(row["Sprint"])].append(row)
        elif row.get("_type") == "summary" and row.get("Sprint") != "SPRINT0":
            summaries[str(row["Sprint"])] = row
    for sprint in sorted(by_sprint, key=sprint_sort_key):
        sheet_name = re.sub(r"\s+", "", sprint)[:31]
        sheet = workbook.create_sheet(sheet_name)
        write_sprint_sheet(sheet, sprint, by_sprint[sprint], summaries[sprint])

    workbook.calculation.fullCalcOnLoad = True
    workbook.calculation.forceFullCalc = True
    workbook.calculation.calcMode = "auto"
    fixed_time = datetime(2000, 1, 1)
    workbook.properties.created = fixed_time
    workbook.properties.modified = fixed_time
    path.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(path)
    normalize_xlsx_archive(path)


def normalize_xlsx_archive(path: Path) -> None:
    """Make XLSX ZIP metadata deterministic so unchanged reports do not create commits."""
    source = BytesIO(path.read_bytes())
    output = BytesIO()
    fixed_zip_time = (2000, 1, 1, 0, 0, 0)
    with zipfile.ZipFile(source, "r") as input_zip, zipfile.ZipFile(
        output, "w", compression=zipfile.ZIP_DEFLATED
    ) as output_zip:
        for original in sorted(input_zip.infolist(), key=lambda item: item.filename):
            info = zipfile.ZipInfo(original.filename, date_time=fixed_zip_time)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = original.external_attr
            info.create_system = original.create_system
            output_zip.writestr(info, input_zip.read(original.filename))
    path.write_bytes(output.getvalue())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default=os.getenv("SPRINT0_CONFIG", "costs/sprint0.json"))
    parser.add_argument("--output", default=os.getenv("OUTPUT_CSV", "reports/costes.csv"))
    parser.add_argument("--xlsx-output", default=os.getenv("OUTPUT_XLSX", "reports/costes.xlsx"))
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
    xlsx_output = Path(args.xlsx_output)
    write_xlsx(xlsx_output, rows, config)
    task_count = sum(row.get("_type") == "task" for row in rows)
    print(
        f"Reports generated: {output} and {xlsx_output} "
        f"({task_count} parent tasks; parent and descendant hours aggregated)"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1)
