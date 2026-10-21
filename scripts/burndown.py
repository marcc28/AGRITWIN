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
