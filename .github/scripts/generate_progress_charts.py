
from collections import Counter
from datetime import datetime, timezone

import numpy as np
import matplotlib.dates as mdates
import matplotlib.pyplot as plt

import csv
import os
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import requests
from scipy.interpolate import PchipInterpolator

# ============================================================
# CONFIGURACIÓ
# ============================================================

REPOSITORY = os.environ["REPOSITORY"]
MILESTONE_TITLE = os.getenv("MILESTONE_TITLE", "").strip()
SPRINT_START_DATE = os.getenv("SPRINT_START_DATE", "").strip()
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
    "planning": "#F59E0B",
    "building": "#F97316",
    "review": "#10B981",
    "blocked": "#A855F7",
    "complete": "#3B82F6",
    "no_status": "#EF4444",
}

COLORS = {
    "blue": "#3B82F6",
    "blue_dark": "#1D4ED8",
    "blue_fill": "#93C5FD",
    "green": "#10B981",
    "green_fill": "#A7F3D0",
    "orange": "#F97316",
    "orange_fill": "#FED7AA",
    "gray": "#94A3B8",
    "text": "#1E293B",
    "muted": "#64748B",
    "grid": "#CBD5E1",
}

# Configuració gràfica moderna
plt.rcParams.update({
    "figure.figsize": (13, 6.5),
    "figure.dpi": 120,
    "figure.facecolor": "#FFFFFF",
    "axes.facecolor": "#FFFFFF",
    "axes.edgecolor": "#E2E8F0",
    "axes.labelcolor": COLORS["muted"],
    "axes.titlecolor": COLORS["text"],
    "axes.titlesize": 17,
    "axes.titleweight": "bold",
    "axes.labelsize": 10,
    "xtick.color": COLORS["muted"],
    "ytick.color": COLORS["muted"],
    "font.family": "DejaVu Sans",
    "font.size": 10,
    "legend.fontsize": 9,
    "legend.frameon": False,
    "svg.fonttype": "none",
    "lines.solid_capstyle": "round",
    "lines.solid_joinstyle": "round",
})



# ============================================================
# AGRITWIN — GITHUB SPRINT PROGRESS CHARTS
# Real observations, no smoothing or interpolation
# ============================================================



# ============================================================
# DATA COLLECTION AND HISTORY
# ============================================================


def github_get_all_issues():
    """Return all repository issues, excluding pull requests."""
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
    if not token:
        raise RuntimeError("GITHUB_TOKEN no està definit.")

    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    params = {"state": "all", "per_page": 100}

    if MILESTONE_TITLE:
        milestone_url = f"https://api.github.com/repos/{REPOSITORY}/milestones"
        response = requests.get(milestone_url, headers=headers,
                                params={"state": "all", "per_page": 100}, timeout=30)
        response.raise_for_status()
        milestones = response.json()
        milestone = next(
            (item for item in milestones if item.get("title") == MILESTONE_TITLE),
            None,
        )
        if milestone is None:
            return []
        params["milestone"] = milestone["number"]

    issues = []
    page = 1
    while True:
        params["page"] = page
        response = requests.get(
            f"https://api.github.com/repos/{REPOSITORY}/issues",
            headers=headers,
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        batch = response.json()
        issues.extend(item for item in batch if "pull_request" not in item)
        if len(batch) < params["per_page"]:
            break
        page += 1
    return issues


def filter_issues(items):
    return [item for item in items if not item.get("pull_request")]


def get_status(issue):
    # A closed issue is complete even when it has no ``complete`` label.
    # Otherwise closed issues are included in the total but incorrectly
    # remain in the pending-work series.
    if str(issue.get("state", "")).lower() == "closed":
        return "complete"

    labels = issue.get("labels", [])
    names = {
        str(label.get("name", label) if isinstance(label, dict) else label)
        .lower().strip()
        for label in labels
    }
    for status in STATUS_ORDER[:-1]:
        if status in names or f"status:{status}" in names:
            return status
    return "no_status"


def parse_date(value):
    if isinstance(value, datetime):
        return value
    return datetime.strptime(str(value), "%Y-%m-%d").date()


def load_history():
    if not HISTORY_FILE.exists():
        return []
    with HISTORY_FILE.open("r", newline="", encoding="utf-8") as handle:
        return [row for row in csv.DictReader(handle) if row.get("date")]


def save_history(rows, fieldnames):
    with HISTORY_FILE.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def style_axis(axis):
    axis.grid(axis="y", color=COLORS["grid"], alpha=0.45, linewidth=0.8)
    axis.set_axisbelow(True)
    axis.spines["top"].set_visible(False)
    axis.spines["right"].set_visible(False)
    axis.spines["left"].set_color(COLORS["grid"])
    axis.spines["bottom"].set_color(COLORS["grid"])


def style_dates(axis):
    axis.xaxis.set_major_locator(mdates.AutoDateLocator())
    axis.xaxis.set_major_formatter(mdates.DateFormatter("%d/%m/%Y"))
    axis.figure.autofmt_xdate()


def save_figure(filename):
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / filename, format="svg", bbox_inches="tight")


def interpolate_series(values, series_dates):
    """Create a smooth, shape-preserving curve through observed values."""
    x = mdates.date2num(series_dates)
    y = np.asarray(values, dtype=float)

    if len(x) < 3:
        return x, y

    smooth_x = np.linspace(x[0], x[-1], max(200, len(x) * 20))
    smooth_y = PchipInterpolator(x, y)(smooth_x)
    return smooth_x, smooth_y


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

# Avoid mixing repositories or milestones.
if history and any(row["scope"] != scope for row in history):
    raise RuntimeError(
        "Aquest historial correspon a un altre repositori "
        "o milestone. Arxiva docs/progress/history.csv "
        "o utilitza una carpeta diferent."
    )

# Update today's record instead of creating duplicates.
history = [
    row for row in history
    if row["date"] != today
]

# Current snapshot.
snapshot = {
    "date": today,
    "scope": scope,
    "total": total,
    "completed": completed,
    "remaining": remaining,
    "planned": planned,
    "unplanned": unplanned,
}

for status in STATUS_ORDER:
    snapshot[status] = status_count[status]

history.append(snapshot)
history.sort(key=lambda row: row["date"])

save_history(history, fields)


# ============================================================
# PREPARE REAL OBSERVATIONS
# ============================================================

dates = [
    parse_date(row["date"])
    for row in history
]

if not history:
    raise RuntimeError("No hi ha dades a l'historial.")

chart_dates = dates

sprint_start = parse_date(SPRINT_START_DATE) if SPRINT_START_DATE else dates[0]
sprint_end = parse_date(SPRINT_END_DATE) if SPRINT_END_DATE else dates[-1]
if sprint_start > sprint_end:
    raise ValueError("SPRINT_START_DATE no pot ser posterior a SPRINT_END_DATE.")

chart_remaining = [
    int(row["remaining"])
    for row in history
]

chart_planned = [
    int(row["planned"])
    for row in history
]

chart_unplanned = [
    int(row["unplanned"])
    for row in history
]

# Use configured sprint boundaries, or the first and last recorded dates.
initial_remaining = chart_remaining[0]
smooth_dates, smooth_remaining = interpolate_series(
    chart_remaining,
    chart_dates,
)


# ============================================================
# CHART 1: BURN-UP BY STATUS
# ============================================================

fig, ax = plt.subplots(figsize=(13, 6.5))

cumulative = np.zeros(len(history), dtype=int)

for status in STATUS_ORDER:
    values = np.array(
        [int(row[status]) for row in history],
        dtype=int,
    )

    upper = cumulative + values
    smooth_x, smooth_upper = interpolate_series(upper, dates)
    _, smooth_cumulative = interpolate_series(cumulative, dates)

    # Smooth area through the real observations.
    ax.fill_between(
        smooth_x,
        smooth_cumulative,
        smooth_upper,
        color=STATUS_COLORS[status],
        alpha=0.22,
        linewidth=0,
    )

    # Smooth status boundary.
    ax.step(
        dates,
        upper,
        where="post",
        color=STATUS_COLORS[status],
        linewidth=1.8,
        label=STATUS_LABELS[status],
    )

    # Exact recorded observations.
    ax.plot(
        dates,
        upper,
        linestyle="none",
        marker="o",
        markersize=4,
        color=STATUS_COLORS[status],
        alpha=0.9,
    )

    cumulative = upper

ax.set_title("Burn-up per estat", loc="left", pad=18)
ax.set_xlabel("Data (UTC)")
ax.set_ylabel("Nombre d'issues")
ax.set_ylim(bottom=0)

style_axis(ax)
style_dates(ax)

ax.legend(
    ncol=3,
    loc="upper left",
    bbox_to_anchor=(0, 1.01),
    columnspacing=1.6,
    handlelength=2.2,
)

save_figure("01-burnup-by-status.svg")
plt.close(fig)


# ============================================================
# CHART 2: SPRINT BURNDOWN
# ============================================================

fig, ax = plt.subplots(figsize=(13, 6.5))

# Real pending-work observations.
ax.fill_between(
    smooth_dates,
    smooth_remaining,
    0,
    color=COLORS["blue_fill"],
    alpha=0.24,
)

ax.plot(
    smooth_dates,
    smooth_remaining,
    color=COLORS["blue"],
    linewidth=2.5,
    label="Treball pendent real",
)

ax.plot(
    chart_dates,
    chart_remaining,
    linestyle="none",
    marker="o",
    markersize=5,
    color=COLORS["blue"],
)

# Ideal reference: linear decrease to zero.
ax.plot(
    [sprint_start, sprint_end],
    [initial_remaining, 0],
    linestyle="--",
    linewidth=2,
    color=COLORS["gray"],
    label="Trajectòria ideal",
)

ax.set_title("Sprint Burndown", loc="left", pad=18)
ax.set_xlabel("Data")
ax.set_ylabel("Nombre d'issues pendents")

ax.set_xlim(sprint_start, sprint_end)
ax.set_ylim(bottom=0)

style_axis(ax)
style_dates(ax)

ax.legend(
    loc="upper right",
    handlelength=2.8,
)

save_figure("02-burndown.svg")
plt.close(fig)


# ============================================================
# CHART 3: BURNDOWN WITH SCOPE CHANGES
# ============================================================

fig, ax = plt.subplots(figsize=(13, 6.5))

chart_total_scope = [
    p + u
    for p, u in zip(chart_planned, chart_unplanned)
]
smooth_planned_dates, smooth_planned = interpolate_series(
    chart_planned,
    chart_dates,
)
_, smooth_total_scope = interpolate_series(chart_total_scope, chart_dates)

# Planned scope.
ax.fill_between(
    smooth_planned_dates,
    smooth_planned,
    0,
    color=COLORS["green_fill"],
    alpha=0.30,
)

ax.step(
    chart_dates,
    chart_planned,
    where="post",
    color=COLORS["green"],
    linewidth=2,
    label="Abast planificat",
    zorder=2,
)

# Unplanned scope, stacked above planned scope.
ax.fill_between(
    smooth_planned_dates,
    smooth_planned,
    smooth_total_scope,
    color=COLORS["orange_fill"],
    alpha=0.55,
)

ax.step(
    chart_dates,
    chart_total_scope,
    where="post",
    color=COLORS["orange"],
    linewidth=2,
    label="Abast total",
    zorder=3,
)

# Actual remaining work.
ax.fill_between(
    smooth_dates,
    smooth_remaining,
    0,
    color=COLORS["blue_fill"],
    alpha=0.16,
)

ax.plot(
    smooth_dates,
    smooth_remaining,
    color=COLORS["blue"],
    linewidth=2.5,
    label="Treball pendent real",
    zorder=4,
)

ax.plot(
    chart_dates,
    chart_remaining,
    linestyle="none",
    marker="o",
    markersize=5,
    color=COLORS["blue"],
    zorder=5,
)

# Ideal reference trajectory.
ax.plot(
    [sprint_start, sprint_end],
    [initial_remaining, 0],
    linestyle="--",
    linewidth=2,
    color=COLORS["gray"],
    label="Trajectòria ideal",
    zorder=1,
)

ax.set_title(
    "Sprint Burndown amb canvis d'abast",
    loc="left",
    pad=18,
)
ax.set_xlabel("Data")
ax.set_ylabel("Nombre d'issues")

ax.set_xlim(sprint_start, sprint_end)
ax.set_ylim(bottom=0)

style_axis(ax)
style_dates(ax)

ax.legend(
    ncol=2,
    loc="upper left",
    columnspacing=1.6,
    handlelength=2.4,
)

save_figure("03-burndown-scope.svg")
plt.close(fig)


# ============================================================
# SUMMARY
# ============================================================

print(
    f"Charts generated for {today}: "
    f"total={total}, "
    f"completed={completed}, "
    f"remaining={remaining}, "
    f"planned={planned}, "
    f"unplanned={unplanned}"
)
