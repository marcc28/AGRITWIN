
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
# GITHUB API
# ============================================================

def github_get_all_issues():
    """Retorna totes les issues obertes i tancades del repositori."""
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
        response = session.get(
            url,
            params=params,
            timeout=30,
        )
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
    """Filtra per milestone i exclou feina descartada."""
    if MILESTONE_TITLE:
        issues = [
            issue
            for issue in issues
            if (issue.get("milestone") or {}).get("title")
            == MILESTONE_TITLE
        ]

    return [
        issue
        for issue in issues
        if not (
            issue["state"] == "closed"
            and issue.get("state_reason") == "not_planned"
        )
    ]


def get_status(issue):
    """Determina l'estat a partir de les etiquetes de GitHub."""
    labels = {
        label["name"].lower().strip()
        for label in issue.get("labels", [])
    }

    if issue["state"] == "closed":
        return "complete"

    for status in ("blocked", "review", "building", "planning"):
        if f"status:{status}" in labels:
            return status

    return "no_status"


# ============================================================
# HISTORIAL
# ============================================================

def load_history():
    if not HISTORY_FILE.exists():
        return []

    with HISTORY_FILE.open(
        newline="",
        encoding="utf-8",
    ) as file:
        return list(csv.DictReader(file))


def save_history(history, fields):
    with HISTORY_FILE.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(history)


def parse_date(value):
    return datetime.strptime(value, "%Y-%m-%d")


def save_figure(filename):
    """Exporta una figura vectorial SVG d'alta qualitat."""
    fig = plt.gcf()
    fig.tight_layout(pad=2.0)
    fig.savefig(
        OUTPUT_DIR / filename,
        format="svg",
        bbox_inches="tight",
        facecolor=fig.get_facecolor(),
    )
    plt.close(fig)


def style_axis(ax, horizontal_grid=True):
    """Aplica un estil net i modern als eixos."""
    ax.set_axisbelow(True)

    ax.grid(
        axis="y" if horizontal_grid else "x",
        color=COLORS["grid"],
        linewidth=0.8,
        alpha=0.45,
    )

    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#E2E8F0")
    ax.spines["bottom"].set_color("#E2E8F0")

    ax.tick_params(
        axis="both",
        which="both",
        length=0,
        pad=8,
    )

    ax.margins(x=0.025)


def style_dates(ax):
    """Millora la lectura de les dates."""
    locator = mdates.AutoDateLocator(minticks=4, maxticks=9)
    ax.xaxis.set_major_locator(locator)
    ax.xaxis.set_major_formatter(
        mdates.ConciseDateFormatter(locator)
    )


# ============================================================
# INTERPOLACIÓ I CORBES
# ============================================================

def smooth_curve(dates, values, points_per_interval=35):
    """
    Genera una corba PCHIP suau sense oscil·lacions artificials.

    Els punts originals es conserven exactament.
    No s'utilitza extrapolació.
    """
    x = mdates.date2num(dates)
    y = np.asarray(values, dtype=float)

    if len(x) != len(y):
        raise ValueError(
            "Les dates i els valors han de tenir la mateixa longitud."
        )

    if len(x) == 0:
        return np.array([]), np.array([])

    # Un únic registre no permet calcular una corba.
    if len(x) == 1:
        return x, y

    if np.any(np.diff(x) <= 0):
        raise ValueError(
            "Les dates de la corba han de ser úniques i ordenades."
        )

    interpolator = PchipInterpolator(x, y, extrapolate=False)

    number_of_points = max(
        len(x),
        (len(x) - 1) * points_per_interval + 1,
    )

    smooth_x = np.linspace(
        x[0],
        x[-1],
        number_of_points,
    )

    smooth_y = interpolator(smooth_x)

    return smooth_x, smooth_y


def smooth_plot(
    ax,
    dates,
    values,
    *,
    color,
    label,
    linewidth=2.8,
    marker=True,
    markersize=5,
    zorder=3,
):
    """Dibuixa una corba suau i conserva els punts observats."""
    x, y = smooth_curve(dates, values)

    if len(x) == 0:
        return

    ax.plot(
        mdates.num2date(x),
        y,
        color=color,
        linewidth=linewidth,
        label=label,
        solid_capstyle="round",
        zorder=zorder,
    )

    if marker:
        ax.plot(
            dates,
            values,
            linestyle="none",
            marker="o",
            markersize=markersize,
            markerfacecolor="#FFFFFF",
            markeredgecolor=color,
            markeredgewidth=1.8,
            zorder=zorder + 1,
        )


def smooth_ideal_curve(start, end, initial_value):
    """
    Crea una trajectòria ideal corbada amb una funció smoothstep.

    És una referència visual, no una previsió real del projecte.
    """
    start_num = mdates.date2num(start)
    end_num = mdates.date2num(end)

    x = np.linspace(start_num, end_num, 250)
    t = (x - start_num) / (end_num - start_num)

    # Descens progressiu, amb inici i final suaus.
    progress = 3 * t**2 - 2 * t**3
    y = initial_value * (1 - progress)

    return mdates.num2date(x), y


def smooth_area(ax, dates, values, color, alpha=0.18):
    """Omple una àrea delimitada per una corba suau."""
    x, y = smooth_curve(dates, values)

    if len(x) == 0:
        return

    smooth_dates = mdates.num2date(x)

    ax.fill_between(
        smooth_dates,
        0,
        y,
        color=color,
        alpha=alpha,
        linewidth=0,
    )


# ============================================================
# CÀLCUL DE LES DADES
# ============================================================

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

# Impedeix barrejar historials de repositoris o milestones diferents.
if history and any(row["scope"] != scope for row in history):
    raise RuntimeError(
        "Aquest historial correspon a un altre repositori o milestone. "
        "Arxiva docs/progress/history.csv o utilitza una carpeta diferent."
    )

# Actualitza el registre d'avui en lloc de duplicar-lo.
history = [
    row
    for row in history
    if row["date"] != today
]

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

# Valida les dates del sprint.
if not SPRINT_START_DATE or not SPRINT_END_DATE:
    raise ValueError(
        "Cal definir SPRINT_START_DATE i SPRINT_END_DATE."
    )

sprint_start = parse_date(SPRINT_START_DATE)
sprint_end = parse_date(SPRINT_END_DATE)

if sprint_end <= sprint_start:
    raise ValueError(
        "La data final ha de ser posterior a la data inicial."
    )

# Historial específic del sprint.
chart_history = [
    row
    for row in history
    if sprint_start <= parse_date(row["date"]) <= sprint_end
]

if not chart_history:
    raise ValueError(
        "No hi ha registres d'historial dins del sprint. "
        "Cal una primera execució que guardi dades dins del període."
    )

chart_history.sort(key=lambda row: row["date"])

chart_dates = [
    parse_date(row["date"])
    for row in chart_history
]

chart_remaining = [
    int(row["remaining"])
    for row in chart_history
]

chart_planned = [
    int(row["planned"])
    for row in chart_history
]

chart_unplanned = [
    int(row["unplanned"])
    for row in chart_history
]


# ============================================================
# GRÀFICA 1: BURN-UP PER ESTAT
# ============================================================

fig, ax = plt.subplots(figsize=(13, 6.5))

# Interpolem cada estat per separat.
# Això manté l'ordre de les àrees apilades i evita
# que els contorns de diferents estats es creuin.
status_curves = {}

for status in STATUS_ORDER:
    values = [
        int(row[status])
        for row in history
    ]

    x, y = smooth_curve(dates=[
        parse_date(row["date"])
        for row in history
    ], values=values)

    status_curves[status] = y

smooth_dates = mdates.num2date(
    smooth_curve(
        [parse_date(row["date"]) for row in history],
        [int(row[STATUS_ORDER[0]]) for row in history],
    )[0]
) if len(history) > 1 else [
    parse_date(history[0]["date"])
]

# Les corbes tenen la mateixa graella temporal.
cumulative = np.zeros(len(smooth_dates))

for status in STATUS_ORDER:
    values = status_curves[status]

    upper = cumulative + values

    ax.fill_between(
        smooth_dates,
        cumulative,
        upper,
        color=STATUS_COLORS[status],
        alpha=0.22,
        linewidth=0,
    )

    ax.plot(
        smooth_dates,
        upper,
        color=STATUS_COLORS[status],
        linewidth=1.8,
        label=STATUS_LABELS[status],
    )

    cumulative = upper

# Marcadors de la frontera superior de cada estat
# en les dates reals de l'historial.
observed_cumulative = np.zeros(len(history))

for status in STATUS_ORDER:
    observed_cumulative += np.array([
        int(row[status])
        for row in history
    ])

    ax.plot(
        [parse_date(row["date"]) for row in history],
        observed_cumulative,
        linestyle="none",
        marker="o",
        markersize=3.5,
        color=STATUS_COLORS[status],
        alpha=0.85,
    )

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


# ============================================================
# GRÀFICA 2: SPRINT BURNDOWN
# ============================================================

fig, ax = plt.subplots(figsize=(13, 6.5))

# Àrea suau del treball pendent.
smooth_area(
    ax,
    chart_dates,
    chart_remaining,
    color=COLORS["blue_fill"],
    alpha=0.24,
)

# Corba del treball real pendent.
smooth_plot(
    ax,
    chart_dates,
    chart_remaining,
    color=COLORS["blue"],
    label="Treball pendent real",
    linewidth=3.0,
    marker=True,
)

# La referència ideal és corbada, no recta.
initial_remaining = chart_remaining[0]

ideal_dates, ideal_values = smooth_ideal_curve(
    sprint_start,
    sprint_end,
    initial_remaining,
)

ax.plot(
    ideal_dates,
    ideal_values,
    linestyle=(0, (5, 4)),
    linewidth=2.2,
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


# ============================================================
# GRÀFICA 3: BURNDOWN AMB CANVIS D'ABAST
# ============================================================

fig, ax = plt.subplots(figsize=(13, 6.5))

# Àrea de l'abast planificat.
smooth_area(
    ax,
    chart_dates,
    chart_planned,
    color=COLORS["green_fill"],
    alpha=0.30,
)

# Àrea de l'abast no planificat.
# Es dibuixa sobre la frontera de l'abast planificat.
x_planned, y_planned = smooth_curve(
    chart_dates,
    chart_planned,
)

x_unplanned, y_unplanned = smooth_curve(
    chart_dates,
    chart_unplanned,
)

if len(x_planned) > 1 and len(x_unplanned) > 1:
    # Les dues corbes comparteixen les dates originals,
    # però poden tenir graelles diferents si hi ha un únic punt.
    upper = y_planned + y_unplanned

    ax.fill_between(
        mdates.num2date(x_planned),
        y_planned,
        upper,
        color=COLORS["orange_fill"],
        alpha=0.55,
        linewidth=0,
    )

# Contorns suaus de l'abast.
smooth_plot(
    ax,
    chart_dates,
    chart_planned,
    color=COLORS["green"],
    label="Abast planificat",
    linewidth=2.0,
    marker=False,
    zorder=2,
)

smooth_plot(
    ax,
    chart_dates,
    [
        planned_value + unplanned_value
        for planned_value, unplanned_value
        in zip(chart_planned, chart_unplanned)
    ],
    color=COLORS["orange"],
    label="Abast total",
    linewidth=2.0,
    marker=False,
    zorder=2,
)

# Treball pendent real.
smooth_area(
    ax,
    chart_dates,
    chart_remaining,
    color=COLORS["blue_fill"],
    alpha=0.16,
)

smooth_plot(
    ax,
    chart_dates,
    chart_remaining,
    color=COLORS["blue"],
    label="Treball pendent real",
    linewidth=3.0,
    marker=True,
    zorder=4,
)

# Trajectòria ideal corbada.
ideal_dates, ideal_values = smooth_ideal_curve(
    sprint_start,
    sprint_end,
    initial_remaining,
)

ax.plot(
    ideal_dates,
    ideal_values,
    linestyle=(0, (5, 4)),
    linewidth=2.0,
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


# ============================================================
# RESULTAT
# ============================================================

print(
    f"Charts generated for {today}: "
    f"total={total}, "
    f"completed={completed}, "
    f"remaining={remaining}, "
    f"planned={planned}, "
    f"unplanned={unplanned}"
)
