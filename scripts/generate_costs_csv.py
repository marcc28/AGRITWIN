#!/usr/bin/env python3

import csv
import json
import os
import re
import urllib.parse
import urllib.request
from collections import defaultdict
from decimal import Decimal
from pathlib import Path


API_VERSION = "2026-03-10"
TOKEN = os.environ["GITHUB_TOKEN"]
REPOSITORY = os.environ["GITHUB_REPOSITORY"]

FIELDS = [
    "row_type",
    "sprint",
    "issue_number",
    "parent_issue_number",
    "title",
    "assignees",
    "state",
    "estimated_hours",
    "final_hours",
    "progress",
    "hourly_rate_eur",
    "planned_cost_eur",
    "actual_cost_eur",
    "earned_value_eur",
    "bac_eur",
    "pv_eur",
    "ac_eur",
    "ev_eur",
    "cpi",
    "spi",
    "cv_eur",
    "sv_eur",
    "eac_eur",
    "etc_eur",
    "vac_eur",
    "url",
    "notes"
]


def api_get(path, parameters=None):
    url = f"https://api.github.com{path}"

    if parameters:
        url += "?" + urllib.parse.urlencode(parameters)

    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {TOKEN}",
            "X-GitHub-Api-Version": API_VERSION,
            "User-Agent": "agritwin-costs-action"
        }
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def decimal_value(value):
    if value is None or value == "":
        return None

    return Decimal(str(value).replace(",", "."))


def blank_row(**values):
    row = {field: "" for field in FIELDS}
    row.update(values)
    return row


def sprint_from_title(title):
    match = re.search(
        r"\[\s*SPRINT\s*(\d+)\s*\]",
        title or "",
        flags=re.IGNORECASE
    )

    if not match:
        return None

    return f"SPRINT {match.group(1)}"


def get_all_issues():
    issues = []

    for page in range(1, 101):
        batch = api_get(
            f"/repos/{REPOSITORY}/issues",
            {
                "state": "all",
                "per_page": 100,
                "page": page
            }
        )

        for issue in batch:
            if "pull_request" not in issue:
                issues.append(issue)

        if len(batch) < 100:
            break

    return issues


def get_issue_fields(issue_number):
    values = api_get(
        f"/repos/{REPOSITORY}/issues/"
        f"{issue_number}/issue-field-values",
        {"per_page": 100}
    )

    result = {}

    for field in values:
        name = field["issue_field_name"]
        value = field.get("value")

        if field.get("single_select_option"):
            value = field["single_select_option"]["name"]

        result[name.lower()] = value

    return result


def get_subissues(issue_number):
    values = api_get(
        f"/repos/{REPOSITORY}/issues/"
        f"{issue_number}/sub_issues",
        {"per_page": 100}
    )

    return [issue["number"] for issue in values]


def load_github_issues():
    issues = get_all_issues()

    for issue in issues:
        issue["_fields"] = get_issue_fields(issue["number"])
        issue["_subissues"] = get_subissues(issue["number"])

    issues_by_number = {
        issue["number"]: issue
        for issue in issues
    }

    for parent in issues:
        for child_number in parent["_subissues"]:
            child = issues_by_number.get(child_number)

            if child:
                child["_parent"] = parent["number"]

    return issues, issues_by_number


def resolve_sprint(issue, issues_by_number):
    current = issue
    visited = set()

    while current and current["number"] not in visited:
        visited.add(current["number"])

        sprint = sprint_from_title(current["title"])

        if sprint:
            return sprint

        parent_number = current.get("_parent")
        current = issues_by_number.get(parent_number)

    return "SIN SPRINT"


def get_field(issue, name):
    fields = issue.get("_fields", {})

    for field_name, value in fields.items():
        normalized = field_name.replace("_", "-").replace(" ", "-")

        if normalized == name.lower():
            return value

    return None


def create_sprint0_rows(config):
    rows = []

    for material in config["materials"]:
        rows.append(
            blank_row(
                row_type="material",
                sprint="SPRINT 0",
                title=material["name"],
                planned_cost_eur=Decimal(
                    str(material["cost_eur"])
                ),
                notes=(
                    f"{material['quantity']} unidades. "
                    f"Plataforma: {material['platform']}"
                )
            )
        )

    labor = config["labor"]

    hours = (
        Decimal(str(labor["sprints"]))
        * Decimal(str(labor["weeks_per_sprint"]))
        * Decimal(str(labor["hours_per_week"]))
    )

    rate = Decimal(str(labor["hourly_rate_eur"]))

    for member in labor["members"]:
        rows.append(
            blank_row(
                row_type="labor_budget",
                sprint="SPRINT 0",
                title=f"Presupuesto de horas: {member}",
                assignees=member,
                estimated_hours=hours,
                hourly_rate_eur=rate,
                planned_cost_eur=hours * rate,
                notes="Coste estático; no procede de GitHub"
            )
        )

    rows.append(
        blank_row(
            row_type="summary",
            sprint="SPRINT 0",
            title="BAC del proyecto",
            planned_cost_eur=Decimal(
                str(config["bac_eur"])
            ),
            bac_eur=Decimal(str(config["bac_eur"])),
            notes="Sprint 0 mantenido fuera de GitHub"
        )
    )

    return rows


def create_issue_row(issue, issues_by_number, hourly_rate):
    sprint = resolve_sprint(issue, issues_by_number)

    if sprint == "SPRINT 0":
        return None

    parent_number = issue.get("_parent", "")
    assignees = "; ".join(
        person["login"]
        for person in issue.get("assignees", [])
    )

    # Los issues padre solo actúan como contenedores.
    if issue["_subissues"]:
        return blank_row(
            row_type="parent_issue",
            sprint=sprint,
            issue_number=issue["number"],
            title=issue["title"],
            assignees=assignees,
            state=issue["state"],
            progress=(
                Decimal("1")
                if issue["state"] == "closed"
                else Decimal("0")
            ),
            url=issue["html_url"],
            notes=(
                "Issue padre. Los costes se calculan "
                "usando sus subissues."
            )
        )

    estimated = decimal_value(
        get_field(issue, "estimated-hours")
    )

    final = decimal_value(
        get_field(issue, "final-hours")
    )

    progress = (
        Decimal("1")
        if issue["state"] == "closed"
        else Decimal("0")
    )

    planned_cost = (
        estimated * hourly_rate
        if estimated is not None
        else None
    )

    actual_cost = (
        final * hourly_rate
        if final is not None
        else None
    )

    earned_value = (
        planned_cost * progress
        if planned_cost is not None
        else None
    )

    notes = []

    if estimated is None:
        notes.append("Falta Estimated-Hours")

    if final is None:
        notes.append("Falta Final-Hours")

    return blank_row(
        row_type="task",
        sprint=sprint,
        issue_number=issue["number"],
        parent_issue_number=parent_number,
        title=issue["title"],
        assignees=assignees,
        state=issue["state"],
        estimated_hours=estimated,
        final_hours=final,
        progress=progress,
        hourly_rate_eur=hourly_rate,
        planned_cost_eur=planned_cost,
        actual_cost_eur=actual_cost,
        earned_value_eur=earned_value,
        url=issue["html_url"],
        notes="; ".join(notes)
    )


def create_summary(sprint, tasks, bac):
    missing_estimated = any(
        task["estimated_hours"] in ("", None)
        for task in tasks
    )

    missing_final = any(
        task["final_hours"] in ("", None)
        for task in tasks
    )

    pv = None
    ac = None
    ev = None

    if not missing_estimated:
        pv = sum(
            task["planned_cost_eur"]
            for task in tasks
        )

        ev = sum(
            task["earned_value_eur"]
            for task in tasks
        )

    if not missing_final:
        ac = sum(
            task["actual_cost_eur"]
            for task in tasks
        )

    cpi = (
        ev / ac
        if ev is not None and ac
        else None
    )

    spi = (
        ev / pv
        if ev is not None and pv
        else None
    )

    eac = (
        bac / cpi
        if cpi
        else None
    )

    return blank_row(
        row_type="summary",
        sprint=sprint,
        title=f"Resumen {sprint}",
        bac_eur=bac,
        pv_eur=pv,
        ac_eur=ac,
        ev_eur=ev,
        cpi=cpi,
        spi=spi,
        cv_eur=(
            ev - ac
            if ev is not None and ac is not None
            else None
        ),
        sv_eur=(
            ev - pv
            if ev is not None and pv is not None
            else None
        ),
        eac_eur=eac,
        etc_eur=(
            eac - ac
            if eac is not None and ac is not None
            else None
        ),
        vac_eur=(
            bac - eac
            if eac is not None
            else None
        ),
        notes=f"{len(tasks)} tareas contabilizadas"
    )


def format_value(value):
    if value is None:
        return ""

    if isinstance(value, Decimal):
        text = format(value, "f")

        if "." in text:
            text = text.rstrip("0").rstrip(".")

        return text

    return value


def main():
    config = json.loads(
        Path("costs/sprint0.json").read_text(
            encoding="utf-8"
        )
    )

    hourly_rate = Decimal(
        str(config["default_hourly_rate_eur"])
    )

    bac = Decimal(str(config["bac_eur"]))
    rows = create_sprint0_rows(config)

    issues, issues_by_number = load_github_issues()
    github_rows = []

    for issue in issues:
        row = create_issue_row(
            issue,
            issues_by_number,
            hourly_rate
        )

        if row:
            github_rows.append(row)

    github_rows.sort(
        key=lambda row: (
            row["sprint"],
            row["parent_issue_number"] or 0,
            row["issue_number"]
        )
    )

    rows.extend(github_rows)

    tasks_by_sprint = defaultdict(list)

    for row in github_rows:
        if row["row_type"] == "task":
            tasks_by_sprint[row["sprint"]].append(row)

    all_tasks = []

    for sprint in sorted(tasks_by_sprint):
        sprint_tasks = tasks_by_sprint[sprint]
        all_tasks.extend(sprint_tasks)

        rows.append(
            create_summary(
                sprint,
                sprint_tasks,
                bac
            )
        )

    if all_tasks:
        rows.append(
            create_summary(
                "TOTAL GITHUB",
                all_tasks,
                bac
            )
        )

    output = Path("reports/costes.csv")
    output.parent.mkdir(parents=True, exist_ok=True)

    with output.open(
        "w",
        encoding="utf-8-sig",
        newline=""
    ) as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=FIELDS
        )

        writer.writeheader()

        for row in rows:
            writer.writerow({
                field: format_value(row.get(field, ""))
                for field in FIELDS
            })

    print(
        f"CSV generado: {output}. "
        f"Tareas contabilizadas: {len(all_tasks)}"
    )


if __name__ == "__main__":
    main()
