import csv
import os
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import requests


REPOSITORY = os.environ["REPOSITORY"]
MILESTONE_TITLE = os.getenv("MILESTONE_TITLE", "").strip()
SPRINT_END_DATE = os.getenv("SPRINT_END_DATE", "").strip()

OUTPUT_DIR = Path("docs/progress")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

HISTORY_FILE = OUTPUT_DIR / "history.csv"

STATUS_ORDER = [
    "planning",
    "building",
    "review",
    "blocked",
    "complete",
    "no_status",
]

STATUS_LABELS = {
    "planning": "Planning",
    "building": "Building",
    "review": "Review",
    "blocked": "Blocked",
    "complete": "Complete",
    "no_status": "No status",
}

STATUS_COLORS = {
    "planning": "#eab308",   # Groc
    "building": "#fb923c",   # Taronja
    "review": "#22c55e",     # Verd
    "blocked": "#a855f7",    # Lila
    "complete": "#2563eb",   # Blau
    "no_status": "#ef4444",  # Vermell
}


def github_get_all_issues():
    """Retorna totes les issues del repositori, obertes i tancades."""
    session = requests.Session()

    session.headers.update({
        "Authorization": f"Bearer {os.environ['GH_TOKEN']}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })

    url = f"https://api.github.com/repos/{REPOSITORY}/issues"
    params = {
        "state": "all",
        "per_page": 100,
    }

    all_issues = []

    while url:
        response = session.get(url, params=params, timeout=30)
        response.raise_for_status()

        all_issues.extend(response.json())

        url = response.links.get("next", {}).get("url")
        params = None

    # L'endpoint d'issues també retorna pull requests.
    return [
        issue
        for issue in all_issues
        if "pull_request" not in issue
    ]


def filter_issues(issues):
    """Filtra per milestone i exclou issues eliminades de l'abast."""
    if MILESTONE_TITLE:
        issues = [
            issue
            for issue in issues
            if (issue.get("milestone") or {}).get("title") == MILESTONE_TITLE
        ]

    # Si una issue s'ha tancat com "not planned", no compta com a feina feta.
    return [
        issue
        for issue in issues
        if not (
            issue["state"] == "closed"
            and issue.get("state_reason") == "not_planned"
        )
    ]


def get_status(issue):
    """
    Extreu l'estat a partir de labels:
    status:planning, status:building, status:review,
    status:blocked o status:complete.
    """
    labels = {
        label["name"].lower().strip()
        for label in issue.get("labels", [])
    }

    if issue["state"] == "closed":
        return "complete"

    for status in ["blocked", "review", "building", "planning"]:
        if f"status:{status}" in labels:
            return status

    return "no_status"


def load_history():
    if not HISTORY_FILE.exists():
        return []

    with HISTORY_FILE.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def save_history(history, fields):
    with HISTORY_FILE.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(history)


def parse_date(value):
    return datetime.strptime(value, "%Y-%m-%d")


def save_figure(filename):
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / filename, format="svg", bbox_inches="tight")
    plt.close()


issues = filter_issues(github_get_all_issues())

scope = (
    f"{REPOSITORY}|milestone:{MILESTONE_TITLE}"
    if MILESTONE_TITLE
    else f"{REPOSITORY}|all-issues"
)

today = datetime.now(timezone.utc).date().isoformat()

status_count = Counter(get_status(issue) for issue in issues)

total = len(issues)
completed = status_count["complete"]
remaining = total - completed

planned = sum(
    1
    for issue in issues
    if "unplanned" not in {
        label["name"].lower().strip()
        for label in issue.get("labels", [])
    }
)

unplanned = total - planned

fields = [
    "date",
    "scope",
    "total",
    "completed",
    "remaining",
    "planned",
    "unplanned",
    *STATUS_ORDER,
]

history = load_history()

# Impedeix barrejar el seguiment de sprints diferents.
if history and any(row["scope"] != scope for row in history):
    raise RuntimeError(
        "Aquest historial correspon a un altre repositori o milestone. "
        "Arxiva docs/progress/history.csv o usa una carpeta diferent "
        "per a cada sprint."
    )

# Si s'executa més d'una vegada avui, només actualitza el punt d'avui.
history = [row for row in history if row["date"] != today]

new_row = {
    "date": today,
    "scope": scope,
    "total": total,
    "completed": completed,
    "remaining": remaining,
    "planned": planned,
    "unplanned": unplanned,
}

for status in STATUS_ORDER:
    new_row[status] = status_count[status]

history.append(new_row)
history.sort(key=lambda row: row["date"])

save_history(history, fields)

dates = [parse_date(row["date"]) for row in history]

totals = [int(row["total"]) for row in history]
completed_values = [int(row["completed"]) for row in history]
remaining_values = [int(row["remaining"]) for row in history]
planned_values = [int(row["planned"]) for row in history]
unplanned_values = [int(row["unplanned"]) for row in history]


# ------------------------------------------------------------
# GRÀFICA 1: BURN UP PER ESTAT
# ------------------------------------------------------------

plt.figure(figsize=(13, 6))

cumulative = [0] * len(history)

for status in STATUS_ORDER:
    values = [int(row[status]) for row in history]

    plt.fill_between(
        dates,
        cumulative,
        [current + value for current, value in zip(cumulative, values)],
        step="post",
        alpha=0.30,
        color=STATUS_COLORS[status],
        label=STATUS_LABELS[status],
    )

    plt.step(
        dates,
        [current + value for current, value in zip(cumulative, values)],
        where="post",
        color=STATUS_COLORS[status],
        linewidth=1.5,
    )

    cumulative = [
        current + value
        for current, value in zip(cumulative, values)
    ]

plt.title("Burn up per status")
plt.xlabel("Date (UTC)")
plt.ylabel("Number of issues")
plt.ylim(bottom=0)
plt.grid(alpha=0.25)
plt.legend(ncol=3, loc="upper left")
plt.gcf().autofmt_xdate()

save_figure("01-burnup-by-status.svg")


# ------------------------------------------------------------
# GRÀFICA 2: BURN DOWN D'ISSUES PENDENTS + LÍNIA IDEAL
# ------------------------------------------------------------

plt.figure(figsize=(13, 6))

plt.plot(
    dates,
    remaining_values,
    marker="o",
    linewidth=2.5,
    color="#2563eb",
    label="Actual remaining work",
)

if len(dates) >= 1 and SPRINT_END_DATE:
    sprint_start = dates[0]
    sprint_end = parse_date(SPRINT_END_DATE)

    if sprint_end > sprint_start:
        ideal_dates = [sprint_start, sprint_end]
        ideal_values = [remaining_values[0], 0]

        plt.plot(
            ideal_dates,
            ideal_values,
            linestyle="--",
            linewidth=2,
            color="#94a3b8",
            label="Ideal guideline",
        )

plt.title("Burn down")
plt.xlabel("Date (UTC)")
plt.ylabel("Open issues")
plt.ylim(bottom=0)
plt.grid(alpha=0.25)
plt.legend()
plt.gcf().autofmt_xdate()

save_figure("02-burndown.svg")


# ------------------------------------------------------------
# GRÀFICA 3: BURN DOWN AMB ABAST PLANIFICAT / NO PLANIFICAT
# ------------------------------------------------------------

plt.figure(figsize=(13, 6))

plt.bar(
    dates,
    planned_values,
    color="#bbf7d0",
    edgecolor="#16a34a",
    label="Planned scope",
    width=0.8,
)

plt.bar(
    dates,
    unplanned_values,
    bottom=planned_values,
    color="#ffedd5",
    edgecolor="#ea580c",
    label="Unplanned scope",
    width=0.8,
)

plt.plot(
    dates,
    remaining_values,
    marker="o",
    linewidth=2.5,
    color="#2563eb",
    label="Actual remaining work",
)

if len(dates) >= 1 and SPRINT_END_DATE:
    sprint_start = dates[0]
    sprint_end = parse_date(SPRINT_END_DATE)

    if sprint_end > sprint_start:
        plt.plot(
            [sprint_start, sprint_end],
            [remaining_values[0], 0],
            linestyle="--",
            linewidth=2,
            color="#94a3b8",
            label="Ideal guideline",
        )

plt.title("Burn down with scope changes")
plt.xlabel("Date (UTC)")
plt.ylabel("Number of issues")
plt.ylim(bottom=0)
plt.grid(axis="y", alpha=0.25)
plt.legend(ncol=2)
plt.gcf().autofmt_xdate()

save_figure("03-burndown-scope.svg")

print(
    f"Charts generated for {today}: "
    f"total={total}, completed={completed}, "
    f"remaining={remaining}, planned={planned}, "
    f"unplanned={unplanned}"
)