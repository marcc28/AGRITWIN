#!/usr/bin/env python3
"""Generate a project-cost CSV from static Sprint 0 data and GitHub tasks."""

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
    "row_type",
    "sprint",
    "source",
    "repository",
    "issue_number",
    "parent_issue_number",
    "parent_issue_title",
    "item",
    "quantity",
    "assignees",
    "state",
    "url",
    "planned_hours",
    "actual_hours",
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
    "notes",
]

LABEL_ALIASES = {
    "planned_hours": [
        "Estimated-Hours",
        "Estimated hours",
        "Estimate",
        "Horas estimadas",
        "Hores estimades",
        "EH",
    ],
    "actual_hours": [
        "Final-Hours",
        "Actual hours",
        "Hours spent",
        "Spent hours",
        "Horas reales",
        "Hores reals",
        "FH",
    ],
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


def configured_aliases(key: str) -> list[str]:
    env_name = f"COSTS_LABEL_{key.upper()}"
    configured = [part.strip() for part in os.getenv(env_name, "").split(",") if part.strip()]
    return configured + LABEL_ALIASES[key]


def label_number(labels: Iterable[dict[str, Any] | str], key: str) -> Decimal | None:
    """Read a number encoded in an issue label, e.g. ``Estimated-Hours: 6.5``."""
    for label in labels:
        name = label.get("name", "") if isinstance(label, dict) else str(label)
        normalized_name = normalize_text(name)
        for alias in configured_aliases(key):
            normalized_alias = normalize_text(alias)
            if not normalized_name.startswith(normalized_alias):
                continue
            suffix = normalized_name[len(normalized_alias) :]
            # Accepted forms: "Alias: 6", "Alias=6" and "Alias 6".
            if not re.match(r"^\s*(?::|=)?\s*-?\d", suffix):
                continue
            value = decimal_value(suffix)
            if value is not None:
                return value
    return None


def sprint_from_task(task: dict[str, Any]) -> str:
    title_match = re.search(r"\[\s*SPRINT\s*(\d+)\s*\]", task.get("title", ""), re.IGNORECASE)
    if title_match:
        return f"SPRINT {title_match.group(1)}"
    if task.get("inherited_sprint"):
        return str(task["inherited_sprint"])
    return "Sin sprint"


def is_sprint_zero(sprint: str) -> bool:
    compact = re.sub(r"[^a-z0-9]", "", normalize_text(sprint))
    return compact in {"0", "sprint0", "s0"} or bool(
        re.search(r"(?:^|\b)(?:sprint|s)\s*[-_:]?\s*0(?:\b|$)", normalize_text(sprint))
    )


def blank_row(**values: Any) -> dict[str, Any]:
    row = {field: "" for field in CSV_FIELDS}
    row.update(values)
    return row


def static_sprint_zero_rows(config: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for material in config.get("materials", []):
        rows.append(
            blank_row(
                row_type="material",
                sprint="SPRINT0",
                source="static:sprint0.json",
                item=material["name"],
                quantity=material.get("quantity", ""),
                planned_cost_eur=Decimal(str(material["line_cost_eur"])),
                notes=f"Plataforma: {material.get('platform', '')}".rstrip(),
            )
        )

    labor = config["labor_budget"]
    total_hours = (
        Decimal(str(labor["sprints"]))
        * Decimal(str(labor["weeks_per_sprint"]))
        * Decimal(str(labor["hours_per_week"]))
    )
    rate = Decimal(str(labor["hourly_rate_eur"]))
    for member in labor["members"]:
        rows.append(
            blank_row(
                row_type="labor_budget",
                sprint="SPRINT0",
                source="static:sprint0.json",
                item=f"Presupuesto de horas: {member}",
                assignees=member,
                planned_hours=total_hours,
                hourly_rate_eur=rate,
                planned_cost_eur=total_hours * rate,
                notes=(
                    f"{labor['sprints']} sprints × {labor['weeks_per_sprint']} semanas/sprint "
                    f"× {labor['hours_per_week']} h/semana"
                ),
            )
        )

    manual_total = sum(
        (Decimal(str(row["planned_cost_eur"])) for row in rows), start=ZERO
    )
    bac = Decimal(str(config["bac_eur"]))
    note = "Costes del Sprint 0 mantenidos fuera de GitHub."
    if manual_total != bac:
        note += f" Diferencia entre detalle ({manual_total}) y BAC configurado ({bac})."
    rows.append(
        blank_row(
            row_type="summary",
            sprint="SPRINT0",
            source="static:sprint0.json",
            item="Resumen Sprint 0 / BAC",
            planned_cost_eur=manual_total,
            bac_eur=bac,
            notes=note,
        )
    )
    return rows


def task_row(task: dict[str, Any], default_rate: Decimal) -> dict[str, Any] | None:
    sprint = sprint_from_task(task)
    if is_sprint_zero(sprint):
        return None

    labels = task.get("labels") or []
    planned = label_number(labels, "planned_hours")
    actual = label_number(labels, "actual_hours")
    progress = Decimal("1") if normalize_text(task.get("state")) == "closed" else ZERO
    rate = default_rate

    notes: list[str] = []
    if planned is None:
        notes.append("Faltan horas estimadas")
    if actual is None:
        notes.append("Faltan horas reales")

    assignees = task.get("assignees") or []
    names = [item.get("login", "") if isinstance(item, dict) else str(item) for item in assignees]
    planned_cost = planned * rate if planned is not None else None
    actual_cost = actual * rate if actual is not None else None
    earned_value = planned_cost * progress if planned_cost is not None else None

    is_parent = bool(task.get("subissue_numbers"))
    if is_parent:
        planned = actual = planned_cost = actual_cost = earned_value = None
        notes = ["Issue padre; los costes se contabilizan únicamente en sus subissues"]

    return blank_row(
        row_type="parent_issue" if is_parent else "task",
        sprint=sprint,
        source=task.get("source", "github:issues"),
        repository=task.get("repository", ""),
        issue_number=task.get("number", ""),
        parent_issue_number=task.get("parent_issue_number", ""),
        parent_issue_title=task.get("parent_issue_title", ""),
        item=task.get("title", ""),
        assignees="; ".join(filter(None, names)),
        state=task.get("state", ""),
        url=task.get("html_url") or task.get("url", ""),
        planned_hours=planned,
        actual_hours=actual,
        progress=progress,
        hourly_rate_eur=rate,
        planned_cost_eur=planned_cost,
        actual_cost_eur=actual_cost,
        earned_value_eur=earned_value,
        notes="; ".join(notes),
    )


def summary_row(
    sprint: str,
    tasks: list[dict[str, Any]],
    bac: Decimal,
) -> dict[str, Any]:
    missing_planned = sum(1 for row in tasks if row["planned_hours"] in (None, ""))
    missing_actual = sum(1 for row in tasks if row["actual_hours"] in (None, ""))
    pv = None if missing_planned else sum(
        (value_or_zero(row["planned_cost_eur"]) for row in tasks), start=ZERO
    )
    ac = None if missing_actual else sum(
        (value_or_zero(row["actual_cost_eur"]) for row in tasks), start=ZERO
    )
    ev = None if missing_planned else sum(
        (value_or_zero(row["earned_value_eur"]) for row in tasks), start=ZERO
    )
    cpi = ev / ac if ev is not None and ac else None
    spi = ev / pv if ev is not None and pv else None
    eac = bac / cpi if cpi else None
    notes = [f"{len(tasks)} tareas"]
    if missing_planned:
        notes.append(f"{missing_planned} sin horas estimadas")
    if missing_actual:
        notes.append(f"{missing_actual} sin horas reales")
    return blank_row(
        row_type="summary",
        sprint=sprint,
        source="calculated",
        item=f"Resumen {sprint}",
        bac_eur=bac,
        pv_eur=pv,
        ac_eur=ac,
        ev_eur=ev,
        cpi=cpi,
        spi=spi,
        cv_eur=ev - ac if ev is not None and ac is not None else None,
        sv_eur=ev - pv if ev is not None and pv is not None else None,
        eac_eur=eac,
        etc_eur=eac - ac if eac is not None and ac is not None else None,
        vac_eur=bac - eac if eac is not None else None,
        notes="; ".join(notes),
    )


def value_or_zero(value: Any) -> Decimal:
    return value if isinstance(value, Decimal) else decimal_value(value) or ZERO


def build_rows(config: dict[str, Any], tasks: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    tasks = list(tasks)
    tasks_by_number = {task.get("number"): task for task in tasks}
    for parent in tasks:
        for child_number in parent.get("subissue_numbers", []):
            child = tasks_by_number.get(child_number)
            if child:
                child["parent_issue_number"] = parent.get("number", "")
                child["parent_issue_title"] = parent.get("title", "")
    for task in tasks:
        current = task
        visited: set[Any] = set()
        while current.get("parent_issue_number") and current.get("number") not in visited:
            visited.add(current.get("number"))
            parent = tasks_by_number.get(current["parent_issue_number"])
            if not parent:
                break
            inherited = sprint_from_task(parent)
            if inherited != "Sin sprint":
                task["inherited_sprint"] = inherited
                break
            current = parent

    rows = static_sprint_zero_rows(config)
    rate = Decimal(str(config["default_hourly_rate_eur"]))
    github_rows = [row for task in tasks if (row := task_row(task, rate)) is not None]
    github_rows.sort(key=lambda row: (sprint_sort_key(str(row["sprint"])), str(row["item"])))
    rows.extend(github_rows)
    task_rows = [row for row in github_rows if row["row_type"] == "task"]

    by_sprint: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in task_rows:
        by_sprint[str(row["sprint"])].append(row)
    bac = Decimal(str(config["bac_eur"]))
    for sprint in sorted(by_sprint, key=sprint_sort_key):
        rows.append(summary_row(sprint, by_sprint[sprint], bac))
    if task_rows:
        rows.append(summary_row("TOTAL_GITHUB", task_rows, bac))
    return rows


def sprint_sort_key(value: str) -> tuple[int, int, str]:
    match = re.search(r"\d+", value)
    return (0, int(match.group(0)), normalize_text(value)) if match else (1, 0, normalize_text(value))


def api_request(url: str, token: str) -> Any:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": API_VERSION,
            "User-Agent": "project-costs-action",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub API returned HTTP {error.code}: {body}") from error


def fetch_repository_issues(repository: str, token: str) -> list[dict[str, Any]]:
    owner, repo = repository.split("/", 1)
    tasks: list[dict[str, Any]] = []
    for page in range(1, 101):
        query = urllib.parse.urlencode({"state": "all", "per_page": 100, "page": page})
        batch = api_request(f"https://api.github.com/repos/{owner}/{repo}/issues?{query}", token)
        for issue in batch:
            if "pull_request" in issue:
                continue
            issue["repository"] = repository
            issue["source"] = "github:issues"
            issue["subissue_numbers"] = []
            for subissue_page in range(1, 101):
                subissues = api_request(
                    f"https://api.github.com/repos/{owner}/{repo}/issues/{issue['number']}"
                    f"/sub_issues?per_page=100&page={subissue_page}",
                    token,
                )
                issue["subissue_numbers"].extend(subissue["number"] for subissue in subissues)
                if len(subissues) < 100:
                    break
            tasks.append(issue)
        if len(batch) < 100:
            break
    return tasks


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
            writer.writerow({key: format_value(row.get(key, "")) for key in CSV_FIELDS})


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default=os.getenv("SPRINT0_CONFIG", "costs/sprint0.json"))
    parser.add_argument("--output", default=os.getenv("OUTPUT_CSV", "reports/costes.csv"))
    parser.add_argument("--issues-json", help="Fixture local para pruebas; evita llamadas a GitHub")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    if args.issues_json:
        tasks = json.loads(Path(args.issues_json).read_text(encoding="utf-8"))
    else:
        token = os.getenv("GITHUB_TOKEN", "")
        repository = os.getenv("GITHUB_REPOSITORY", "")
        if not token or not repository:
            raise RuntimeError("GITHUB_TOKEN y GITHUB_REPOSITORY son obligatorios")
        tasks = fetch_repository_issues(repository, token)

    rows = build_rows(config, tasks)
    output = Path(args.output)
    write_csv(output, rows)
    task_count = sum(row["row_type"] == "task" for row in rows)
    print(f"CSV generado: {output} ({task_count} tareas de GitHub, Sprint 0 estático)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1)
