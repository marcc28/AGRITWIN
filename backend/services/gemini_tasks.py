"""Turn a garden snapshot into tasks and recommendations with Gemini."""

from __future__ import annotations

import asyncio
import json
import os
import re
from dataclasses import dataclass
from datetime import date, timedelta

from google import genai

STALE_HOURS = 12
LANGUAGE_NAMES = {
    "ca": "Catalan",
    "es": "Spanish",
    "en": "English",
    "it": "Italian",
}
PRIORITIES = ("high", "medium", "low")
FUTURE_DAYS = 7
# A pending AI task from the last days moves to today when it repeats.
RECENT_DAYS = 3
# A pending AI task older than this is deleted.
EXPIRE_DAYS = 7
MAX_TASKS = 5
MAX_RECOMMENDATIONS = 3
GEMINI_TIMEOUT_SECONDS = 45


@dataclass(frozen=True)
class StoredTask:
    id: int
    signature: str | None
    due_on: date | None
    completed: bool
    source: str


@dataclass(frozen=True)
class PlannedTask:
    key: str
    title: str
    details: str | None
    due_on: date
    priority: str


@dataclass(frozen=True)
class PlannedClose:
    key: str
    due_on: date
    reason: str


@dataclass(frozen=True)
class PlannedRecommendation:
    key: str
    title: str
    details: str | None
    due_on: date


@dataclass(frozen=True)
class AiPlan:
    tasks: list[PlannedTask]
    closes: list[PlannedClose]
    recommendations: list[PlannedRecommendation]


@dataclass(frozen=True)
class TaskChange:
    delete_ids: list[int]
    complete: list[tuple[int, str]]
    insert: list[PlannedTask]
    update: list[tuple[int, PlannedTask]]


def normalize_language(value) -> str:
    """Return one of the app languages ('ca', 'es', 'en', 'it'), 'ca' by default."""
    code = str(value or "").strip().lower()[:2]
    return code if code in LANGUAGE_NAMES else "ca"


def _priority(value) -> str:
    text = str(value or "").strip().lower()
    if text in PRIORITIES:
        return text
    return "medium"


def _date(value, today: date) -> date | None:
    if not isinstance(value, str):
        return None
    try:
        found = date.fromisoformat(value[:10])
    except ValueError:
        return None
    if found < today or found > today + timedelta(days=FUTURE_DAYS):
        return None
    return found


def _text(value, limit: int) -> str:
    return str(value or "").strip()[:limit]


def _key(value) -> str:
    """A short stable id: lowercase letters, digits and underscores."""
    text = re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower())
    return text.strip("_")[:80]


def _rows(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    return [row for row in value if isinstance(row, dict)]


def parse_plan(raw: str, today: date, allow_tasks: bool = True) -> AiPlan:
    """Read the model answer and keep only complete, valid rows.

    Without sensors (allow_tasks=False) only recommendations are kept.
    """
    text = raw.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1).strip()
    data = json.loads(text)
    if not isinstance(data, dict):
        return AiPlan([], [], [])

    tasks: list[PlannedTask] = []
    closes: list[PlannedClose] = []
    if allow_tasks:
        for row in _rows(data.get("tasks")):
            key = _key(row.get("key"))
            title = _text(row.get("title"), 200)
            due_on = _date(row.get("date"), today)
            if not key or not title or due_on is None:
                continue
            details = _text(row.get("details"), 500) or None
            tasks.append(PlannedTask(key, title, details, due_on, _priority(row.get("priority"))))

        for row in _rows(data.get("close")):
            key = _key(row.get("key"))
            reason = _text(row.get("reason"), 200)
            due_on = _date(row.get("date"), today)
            if not key or not reason or due_on != today:
                continue
            closes.append(PlannedClose(key, due_on, reason))

    recommendations: list[PlannedRecommendation] = []
    for row in _rows(data.get("recommendations")):
        key = _key(row.get("key"))
        title = _text(row.get("title"), 200)
        due_on = _date(row.get("date"), today)
        if not key or not title or due_on is None:
            continue
        details = _text(row.get("details"), 500) or None
        recommendations.append(PlannedRecommendation(key, title, details, due_on))

    return AiPlan(
        tasks[:MAX_TASKS],
        closes[:MAX_TASKS],
        recommendations[:MAX_RECOMMENDATIONS],
    )


def _pending(existing: list[StoredTask], key: str, due_on: date) -> list[StoredTask]:
    return [
        item
        for item in existing
        if item.source == "ai"
        and not item.completed
        and item.signature == key
        and item.due_on == due_on
    ]


def _recent_ids(existing: list[StoredTask], key: str, today: date) -> list[int]:
    start = today - timedelta(days=RECENT_DAYS)
    end = today - timedelta(days=1)
    return [
        item.id
        for item in existing
        if item.source == "ai"
        and not item.completed
        and item.signature == key
        and item.due_on is not None
        and start <= item.due_on <= end
    ]


def _expired_ids(existing: list[StoredTask], today: date) -> list[int]:
    limit = today - timedelta(days=EXPIRE_DAYS)
    return [
        item.id
        for item in existing
        if item.source == "ai"
        and not item.completed
        and item.due_on is not None
        and item.due_on < limit
    ]


def apply_plan(today: date, existing: list[StoredTask], plan: AiPlan) -> TaskChange:
    """Decide what to store.

    A repeated recent task collapses onto today, one day never holds the same
    task twice, and a pending AI task older than a week is deleted.
    """
    wanted_today = {item.key for item in plan.tasks if item.due_on == today}
    delete_ids: list[int] = _expired_ids(existing, today)
    complete: list[tuple[int, str]] = []
    insert: list[PlannedTask] = []
    update: list[tuple[int, PlannedTask]] = []
    seen_days: set[tuple[str, date]] = set()

    for item in plan.tasks:
        marker = (item.key, item.due_on)
        if marker in seen_days:
            continue
        seen_days.add(marker)
        pending = _pending(existing, item.key, item.due_on)
        if pending:
            update.append((pending[0].id, item))
            delete_ids.extend(row.id for row in pending[1:])
        elif not any(row.signature == item.key and row.due_on == item.due_on for row in existing):
            # Not there yet. A done task, or one the user took over, counts.
            insert.append(item)
        if item.due_on == today:
            delete_ids.extend(_recent_ids(existing, item.key, today))

    for item in plan.closes:
        if item.key in wanted_today:
            continue
        pending = _pending(existing, item.key, today)
        complete.extend((row.id, item.reason) for row in pending)
        delete_ids.extend(_recent_ids(existing, item.key, today))

    completed_ids = {row_id for row_id, _reason in complete}
    unique_deletes = [row_id for row_id in dict.fromkeys(delete_ids) if row_id not in completed_ids]
    return TaskChange(unique_deletes, complete, insert, update)


def build_prompt(snapshot: dict, language: str) -> str:
    language_name = LANGUAGE_NAMES.get(language, "Catalan")
    return (
        "You help a gardener decide what to do in one garden. "
        "'today' is the garden's local date. "
        "Use the sensor readings, the weather forecast, the weather alerts and "
        "the crops together.\n"
        "Rules:\n"
        "- Watering: if the soil is dry and rain is coming, do not create a "
        "watering task; add a recommendation that says not to water yet. If the "
        "soil is dry and no rain is coming, create a watering task.\n"
        "- Harvest: each crop has planted_at and days_since_planted. Use ordinary "
        "knowledge of how long that crop takes to be ready (for example about "
        "three weeks for radish, longer for tomato). If expected_harvest_at is "
        "given, trust it over your own estimate. When a crop is ready or about "
        "to be, create a harvest task. Never invent a crop or a harvest that is "
        "not in crops.\n"
        "- Weather alerts such as frost, heat or wind: add a task or a "
        "recommendation to protect the plants when it matters for these crops.\n"
        "- Sensors: 'sensors' tells how many boards exist, how many are online "
        "and when the last reading arrived. If the readings are old or missing, "
        "do not decide from them and say that the data is old.\n"
        "- If a task for today is no longer needed, put it in close with the "
        "reason, for example that it already rained.\n"
        "- planned_tasks lists the tasks of the last and next 7 days. Do not "
        "repeat a task that already exists on that day.\n"
        "- If can_create_tasks is false, return empty tasks and empty close: "
        "only recommendations are allowed.\n"
        f"- At most {MAX_TASKS} tasks and {MAX_RECOMMENDATIONS} recommendations. "
        "If nothing is needed, return empty lists.\n"
        f"- Write title, details and reason in {language_name}. Keep them short "
        "and practical.\n"
        "- key is a short stable english id in lowercase snake_case: the action, "
        "plus the crop when it is about one crop (water, skip_water, fertilize, "
        "harvest_tomato, protect_frost). The same need must always use the same "
        "key.\n"
        "- priority is high for urgent, medium for normal, low for optional.\n"
        "- date is today or a later day inside the forecast, as YYYY-MM-DD.\n\n"
        "Reply with JSON only, in this shape: "
        '{"recommendations":[{"key":"skip_water","date":"YYYY-MM-DD","title":"...","details":"..."}],'
        '"tasks":[{"key":"water","date":"YYYY-MM-DD","title":"...","details":"...","priority":"high"}],'
        '"close":[{"key":"water","date":"YYYY-MM-DD","reason":"..."}]}\n\n'
        f"{json.dumps(snapshot, default=str, ensure_ascii=False)}"
    )


def _gemini_settings() -> tuple[str, str]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("MODEL_USE_IN_RECOMENDATION", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    if not model:
        raise RuntimeError("MODEL_USE_IN_RECOMENDATION is not configured")
    return api_key, model


async def ask_gemini(snapshot: dict, language: str) -> str:
    api_key, model = _gemini_settings()
    client = genai.Client(api_key=api_key)
    response = await asyncio.wait_for(
        client.aio.interactions.create(
            model=model,
            input=build_prompt(snapshot, language),
            generation_config={"temperature": 0.2, "max_output_tokens": 2500},
        ),
        timeout=GEMINI_TIMEOUT_SECONDS,
    )
    text = response.output_text
    if not text:
        raise RuntimeError("Gemini returned an empty response")
    return text
