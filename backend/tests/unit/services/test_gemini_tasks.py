import asyncio
from datetime import date, timedelta
from types import SimpleNamespace

import pytest

from services import gemini_tasks
from services.gemini_tasks import (
    MAX_RECOMMENDATIONS,
    MAX_TASKS,
    AiPlan,
    PlannedClose,
    PlannedRecommendation,
    PlannedTask,
    StoredTask,
    apply_plan,
    ask_gemini,
    build_prompt,
    normalize_language,
    parse_plan,
)

TODAY = date(2026, 11, 4)


def _stored(row_id, key, days_ago, completed=False, source="ai"):
    return StoredTask(row_id, key, TODAY - timedelta(days=days_ago), completed, source)


def _task(key="water", days=0, priority="medium"):
    return PlannedTask(key, "Regar", None, TODAY + timedelta(days=days), priority)


def _plan(tasks=(), closes=(), recommendations=()):
    return AiPlan(list(tasks), list(closes), list(recommendations))


# ---------------------------------------------------------------- language


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("es-ES", "es"),
        ("EN", "en"),
        ("it", "it"),
        ("ca", "ca"),
        ("fr", "ca"),
        (None, "ca"),
        ("", "ca"),
    ],
)
def test_normalize_language_falls_back_to_catalan(value, expected):
    assert normalize_language(value) == expected


# ---------------------------------------------------------------- parse_plan


def test_parse_plan_keeps_only_complete_rows():
    raw = """
    {"recommendations":[{"key":"skip_water","date":"2026-11-04","title":"No reguis"},
                        {"key":"nokey","date":"2026-11-04","title":""}],
     "tasks":[
        {"key":"water","date":"2026-11-04","title":"Regar","priority":"high"},
        {"key":"","date":"2026-11-04","title":"Sense clau"},
        {"key":"old","date":"2026-10-01","title":"Massa antiga"},
        {"key":"far","date":"2026-12-30","title":"Massa lluny"},
        {"key":"notitle","date":"2026-11-04","title":" "},
        {"key":"nodate","title":"Sense data"},
        "not a row"
     ],
     "close":[{"key":"check_light","date":"2026-11-04","reason":"Ja hi ha prou llum"},
              {"key":"tomorrow","date":"2026-11-05","reason":"No es tanca el futur"},
              {"key":"noreason","date":"2026-11-04","reason":""}]}
    """
    plan = parse_plan(raw, TODAY)
    assert [item.key for item in plan.recommendations] == ["skip_water"]
    assert [(item.key, item.priority) for item in plan.tasks] == [("water", "high")]
    assert [(item.key, item.reason) for item in plan.closes] == [
        ("check_light", "Ja hi ha prou llum")
    ]


def test_parse_plan_reads_json_inside_a_code_fence():
    raw = '```json\n{"tasks":[{"key":"water","date":"2026-11-05","title":"Regar"}]}\n```'
    plan = parse_plan(raw, TODAY)
    assert plan.tasks == [PlannedTask("water", "Regar", None, date(2026, 11, 5), "medium")]


def test_parse_plan_cleans_the_key_and_the_priority():
    raw = (
        '{"tasks":[{"key":" Harvest Tomato! ","date":"2026-11-04","title":"Collir",'
        '"details":"  Ja estan madurs ","priority":"URGENT"}]}'
    )
    task = parse_plan(raw, TODAY).tasks[0]
    assert task.key == "harvest_tomato"
    assert task.details == "Ja estan madurs"
    assert task.priority == "medium"


def test_parse_plan_without_sensors_keeps_only_recommendations():
    raw = (
        '{"recommendations":[{"key":"skip_water","date":"2026-11-04","title":"No reguis"}],'
        '"tasks":[{"key":"water","date":"2026-11-04","title":"Regar"}],'
        '"close":[{"key":"water","date":"2026-11-04","reason":"Ha plogut"}]}'
    )
    plan = parse_plan(raw, TODAY, allow_tasks=False)
    assert plan.tasks == []
    assert plan.closes == []
    assert [item.key for item in plan.recommendations] == ["skip_water"]


def test_parse_plan_limits_how_much_one_answer_can_add():
    tasks = ",".join(
        f'{{"key":"task{index}","date":"2026-11-04","title":"Tasca {index}"}}' for index in range(9)
    )
    recommendations = ",".join(
        f'{{"key":"tip{index}","date":"2026-11-04","title":"Consell {index}"}}'
        for index in range(9)
    )
    plan = parse_plan(f'{{"tasks":[{tasks}],"recommendations":[{recommendations}]}}', TODAY)
    assert len(plan.tasks) == MAX_TASKS
    assert len(plan.recommendations) == MAX_RECOMMENDATIONS


def test_parse_plan_ignores_lists_that_are_not_lists():
    plan = parse_plan('{"tasks":"water","close":{"a":1},"recommendations":null}', TODAY)
    assert plan == AiPlan([], [], [])


def test_parse_plan_returns_nothing_for_a_json_list():
    assert parse_plan("[1, 2]", TODAY) == AiPlan([], [], [])


def test_parse_plan_raises_on_text_that_is_not_json():
    with pytest.raises(ValueError):
        parse_plan("Sorry, I cannot help", TODAY)


def test_parse_plan_rejects_a_date_that_is_not_text():
    raw = '{"tasks":[{"key":"water","date":20261104,"title":"Regar"},'
    raw += '{"key":"bad","date":"not-a-date","title":"Regar"}]}'
    assert parse_plan(raw, TODAY).tasks == []


# ---------------------------------------------------------------- apply_plan


def test_same_day_updates_the_open_task():
    change = apply_plan(TODAY, [_stored(1, "water", 0)], _plan([_task(priority="high")]))
    assert change.insert == []
    assert change.update[0][0] == 1
    assert change.delete_ids == []


def test_recent_pending_task_moves_to_today():
    change = apply_plan(TODAY, [_stored(7, "water", 2)], _plan([_task()]))
    assert change.delete_ids == [7]
    assert [item.due_on for item in change.insert] == [TODAY]


def test_task_four_days_old_is_not_moved_but_today_gets_its_own():
    change = apply_plan(TODAY, [_stored(9, "water", 4)], _plan([_task()]))
    assert change.delete_ids == []
    assert len(change.insert) == 1


def test_pending_ai_task_older_than_a_week_is_deleted():
    existing = [_stored(1, "water", 8), _stored(2, "weed", 30)]
    change = apply_plan(TODAY, existing, _plan())
    assert sorted(change.delete_ids) == [1, 2]


def test_exactly_a_week_old_task_is_kept():
    assert apply_plan(TODAY, [_stored(1, "water", 7)], _plan()).delete_ids == []


def test_old_completed_and_manual_tasks_are_never_deleted():
    existing = [
        _stored(1, "water", 20, completed=True),
        _stored(2, None, 20, source="user"),
    ]
    assert apply_plan(TODAY, existing, _plan()).delete_ids == []


def test_a_task_without_date_is_never_deleted():
    existing = [StoredTask(1, "water", None, False, "ai")]
    assert apply_plan(TODAY, existing, _plan()).delete_ids == []


def test_close_marks_today_and_drops_the_recent_copy():
    existing = [_stored(1, "water", 0), _stored(2, "water", 3)]
    plan = _plan(closes=[PlannedClose("water", TODAY, "Ja ha plogut")])
    change = apply_plan(TODAY, existing, plan)
    assert change.complete == [(1, "Ja ha plogut")]
    assert change.delete_ids == [2]
    assert change.insert == []


def test_close_is_ignored_when_the_same_task_is_wanted_today():
    existing = [_stored(1, "water", 0)]
    plan = _plan([_task()], [PlannedClose("water", TODAY, "Ja ha plogut")])
    change = apply_plan(TODAY, existing, plan)
    assert change.complete == []
    assert change.update[0][0] == 1


def test_a_completed_task_is_not_created_again_the_same_day():
    existing = [_stored(1, "water", 0, completed=True)]
    change = apply_plan(TODAY, existing, _plan([_task()]))
    assert change.insert == []
    assert change.update == []


def test_a_task_the_user_took_over_is_not_created_again_or_changed():
    existing = [_stored(1, "water", 0, source="user")]
    change = apply_plan(TODAY, existing, _plan([_task()]))
    assert change.insert == []
    assert change.update == []
    assert change.delete_ids == []


def test_a_task_the_user_took_over_is_never_closed_or_expired():
    existing = [_stored(1, "water", 9, source="user"), _stored(2, "weed", 0, source="user")]
    plan = AiPlan([], [PlannedClose("weed", TODAY, "Rain")], [])
    change = apply_plan(TODAY, existing, plan)
    assert change.delete_ids == []
    assert change.complete == []


def test_the_same_task_twice_in_one_answer_is_stored_once():
    change = apply_plan(TODAY, [], _plan([_task(), _task()]))
    assert len(change.insert) == 1


def test_a_future_task_is_created_without_touching_the_past():
    change = apply_plan(TODAY, [_stored(5, "water", 1)], _plan([_task(days=2)]))
    assert [item.due_on for item in change.insert] == [TODAY + timedelta(days=2)]
    assert change.delete_ids == []


def test_duplicate_pending_copies_of_one_day_are_collapsed():
    existing = [_stored(1, "water", 0), _stored(2, "water", 0)]
    change = apply_plan(TODAY, existing, _plan([_task()]))
    assert change.update[0][0] == 1
    assert change.delete_ids == [2]


def test_a_task_never_ends_both_deleted_and_completed():
    existing = [_stored(1, "water", 8)]
    plan = _plan(closes=[PlannedClose("water", TODAY, "Ja ha plogut")])
    change = apply_plan(TODAY, existing, plan)
    assert change.delete_ids == [1]
    assert change.complete == []


# ---------------------------------------------------------------- prompt


def test_prompt_asks_for_the_language_and_carries_the_snapshot():
    prompt = build_prompt({"today": "2026-11-04", "crops": [{"name": "Tomàquet"}]}, "es")
    assert "Spanish" in prompt
    assert "Tomàquet" in prompt
    assert "can_create_tasks" in prompt
    assert "harvest" in prompt.lower()


def test_prompt_uses_catalan_for_an_unknown_language():
    assert "Catalan" in build_prompt({}, "xx")


# ---------------------------------------------------------------- Gemini


class _FakeInteractions:
    def __init__(self, text, delay=0.0):
        self.text = text
        self.delay = delay
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        if self.delay:
            await asyncio.sleep(self.delay)
        return SimpleNamespace(output_text=self.text)


def _fake_client(monkeypatch, text="{}", delay=0.0):
    interactions = _FakeInteractions(text, delay)
    keys = []

    def factory(api_key):
        keys.append(api_key)
        return SimpleNamespace(aio=SimpleNamespace(interactions=interactions))

    monkeypatch.setattr(gemini_tasks.genai, "Client", factory)
    return interactions, keys


@pytest.fixture
def gemini_env(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", " test-key ")
    monkeypatch.setenv("MODEL_USE_IN_RECOMENDATION", " test-model ")


async def test_ask_gemini_uses_the_shared_model_setting(monkeypatch, gemini_env):
    interactions, keys = _fake_client(monkeypatch, text='{"tasks": []}')
    answer = await ask_gemini({"today": "2026-11-04"}, "ca")
    assert answer == '{"tasks": []}'
    assert keys == ["test-key"]
    assert interactions.calls[0]["model"] == "test-model"
    assert "2026-11-04" in interactions.calls[0]["input"]


async def test_ask_gemini_needs_the_api_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("MODEL_USE_IN_RECOMENDATION", "test-model")
    with pytest.raises(RuntimeError, match="GEMINI_API_KEY"):
        await ask_gemini({}, "ca")


async def test_ask_gemini_needs_the_model_name(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.delenv("MODEL_USE_IN_RECOMENDATION", raising=False)
    with pytest.raises(RuntimeError, match="MODEL_USE_IN_RECOMENDATION"):
        await ask_gemini({}, "ca")


async def test_ask_gemini_rejects_an_empty_answer(monkeypatch, gemini_env):
    _fake_client(monkeypatch, text="")
    with pytest.raises(RuntimeError, match="empty"):
        await ask_gemini({}, "ca")


async def test_ask_gemini_gives_up_when_the_answer_is_too_slow(monkeypatch, gemini_env):
    _fake_client(monkeypatch, delay=1)
    monkeypatch.setattr(gemini_tasks, "GEMINI_TIMEOUT_SECONDS", 0.01)
    with pytest.raises(asyncio.TimeoutError):
        await ask_gemini({}, "ca")


def test_planned_recommendation_is_a_plain_value():
    item = PlannedRecommendation("skip_water", "No reguis", None, TODAY)
    assert item.key == "skip_water"
