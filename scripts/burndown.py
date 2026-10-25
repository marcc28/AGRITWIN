#!/usr/bin/env python3
"""Generate a daily issue-count burndown for a GitHub milestone.

Environment variables:
  GITHUB_REPOSITORY  (e.g. marcc28/AGRITWIN)
  GITHUB_TOKEN       (GitHub Actions token with issues: read)
  SPRINT_MILESTONE   (default: Sprint 1)
  SPRINT_START       (ISO date, default: 2026-10-06)
  SPRINT_END         (ISO date, default: 2026-10-27)
  SPRINT_TIMEZONE    (default: Europe/Madrid)
  BURNDOWN_OUTPUT    (default: docs/burndown)
"""

from __future__ import annotations

import csv
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import matplotlib
matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import requests


REPO = os.environ.get("GITHUB_REPOSITORY", "marcc28/AGRITWIN")
TOKEN = os.environ.get("GITHUB_TOKEN", "")
MILESTONE = os.environ.get("SPRINT_MILESTONE", "Sprint 1")
START = date.fromisoformat(os.environ.get("SPRINT_START", "2026-10-06"))
END = date.fromisoformat(os.environ.get("SPRINT_END", "2026-10-27"))
TZ = ZoneInfo(os.environ.get("SPRINT_TIMEZONE", "Europe/Madrid"))
OUTPUT = Path(os.environ.get("BURNDOWN_OUTPUT", "docs/burndown"))
BASE = f"https://api.github.com/repos/{REPO}"

SESSION = requests.Session()
SESSION.headers.update({
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10",
    "User-Agent": "github-sprint-burndown",
})
if TOKEN:
    SESSION.headers["Authorization"] = f"Bearer {TOKEN}"


def get_all(path: str, params: dict | None = None) -> list[dict]:
    """Read all REST API pages, not just the default first 30 results."""
    url = f"{BASE}/{path.lstrip('/')}"
    result = []
    while url:
        response = SESSION.get(url, params=params, timeout=40)
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, list):
            raise ValueError(f"Expected list from {url}, got {type(data).__name__}")
        result.extend(data)
        url = response.links.get("next", {}).get("url")
        params = None
    return result


def parsed(iso: str) -> datetime:
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(TZ)


def remaining_on(issue: dict, events: list[tuple[datetime, str]], day: date) -> bool:
    """Is the issue open at local end-of-day? Handles close/reopen cycles."""
    if parsed(issue["created_at"]).date() > day:
        return False
    opened = True
    for event_time, event_type in events:
        if event_time.date() > day:
            break
        opened = event_type == "reopened"
    return opened


def main() -> None:
    if START >= END:
        raise ValueError("SPRINT_START must be earlier than SPRINT_END")
    if not TOKEN:
        raise ValueError("GITHUB_TOKEN is required")

    milestones = get_all("milestones", {"state": "all", "per_page": 100})
    milestone = next((m for m in milestones if m["title"].casefold() == MILESTONE.casefold()), None)
    if not milestone:
        raise ValueError(f"Milestone {MILESTONE!r} not found in {REPO}")

    issues = [
        issue for issue in get_all("issues", {
            "milestone": milestone["number"], "state": "all", "per_page": 100
        })
        if "pull_request" not in issue
    ]
    if not issues:
        raise ValueError(f"No issues in milestone {MILESTONE!r}")
    print(f"Found {len(issues)} issues in {MILESTONE!r}; retrieving sub-issues and closure history...", flush=True)

    by_number = {issue["number"]: issue for issue in issues}
    parents: set[int] = set()
    for issue in issues:
        children = get_all(f"issues/{issue['number']}/sub_issues", {"per_page": 100})
        if any(child["number"] in by_number for child in children):
            parents.add(issue["number"])

    leaf_issues = [i for i in issues if i["number"] not in parents]
    print(f"Counting {len(leaf_issues)} leaf issues (excluding {len(parents)} parent issues).", flush=True)
    histories: dict[int, list[tuple[datetime, str]]] = {}
    for issue in leaf_issues:
        raw_events = get_all(f"issues/{issue['number']}/events", {"per_page": 100})
        events = sorted(
            (parsed(e["created_at"]), e["event"])
            for e in raw_events
            if e.get("event") in ("closed", "reopened") and e.get("created_at")
        )
        if issue.get("closed_at"):
            final_close = parsed(issue["closed_at"])
            if not any(t == final_close and event == "closed" for t, event in events):
                events.append((final_close, "closed"))
                events.sort()
        histories[issue["number"]] = events

    day_before = START - timedelta(days=1)
    initial = sum(
        remaining_on(i, histories[i["number"]], day_before)
        for i in leaf_issues
    )
    today = datetime.now(TZ).date()
    rows: list[dict] = []
    day = START
    while day <= END:
        progress = (day - START).days / (END - START).days
        ideal = initial * (1 - progress)
        if day <= today:
            remaining = sum(remaining_on(i, histories[i["number"]], day) for i in leaf_issues)
            rows.append({"date": day.isoformat(), "ideal": round(ideal, 2), "remaining": remaining})
        else:
            rows.append({"date": day.isoformat(), "ideal": round(ideal, 2), "remaining": ""})
        day += timedelta(days=1)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    print(f"Writing PNG and CSV to {OUTPUT.resolve()}", flush=True)
    png = OUTPUT / "sprint-1-burndown.png"
    csv_path = OUTPUT / "sprint-1-burndown.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=["date", "ideal", "remaining"])
        writer.writeheader()
        writer.writerows(rows)

    x = [date.fromisoformat(row["date"]) for row in rows]
    ideal_y = [row["ideal"] for row in rows]
    actual_y = [row["remaining"] if row["remaining"] != "" else float("nan") for row in rows]

    fig, ax = plt.subplots(figsize=(12, 6.2))
    ax.plot(x, ideal_y, "--", color="#72809a", lw=2, label="Ideal")
    ax.plot(x, actual_y, "-o", color="#d97706", lw=2.5, markersize=3.5, label="Actual (Remaining)")
    if START <= today <= END:
        ax.axvline(today, color="#9ca3af", lw=1, alpha=0.8)
    ax.set(title=f"AGRITWIN | {MILESTONE} Burndown", xlabel="Date", ylabel="Issues / subissues")
    ax.set_ylim(bottom=0)
    ax.set_xlim(START, END)
    ax.grid(alpha=0.20)
    ax.legend(loc="best")
    ax.xaxis.set_major_locator(mdates.AutoDateLocator(minticks=5, maxticks=10))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d %b"))
    fig.autofmt_xdate()
    fig.tight_layout()
    fig.savefig(png, dpi=160)
    plt.close(fig)
    for generated in (png, csv_path):
        if not generated.is_file() or generated.stat().st_size == 0:
            raise RuntimeError(f"Expected output missing or empty: {generated}")

    current = next((r for r in reversed(rows) if r["remaining"] != ""), None)
    if current:
        print(f"{MILESTONE}: {current['remaining']} remaining as of {current['date']}.")
    print(f"Excluded {len(parents)} parent issues to avoid double counting.")
    print(f"Initial pending scope: {initial}. Saved {png} and {csv_path}")


if __name__ == "__main__":
    main()
