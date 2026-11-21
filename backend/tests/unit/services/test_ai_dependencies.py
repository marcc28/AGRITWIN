import importlib
from unittest.mock import MagicMock

import pytest
from google import genai

import services.ai_dependencies as ai_dependencies


@pytest.fixture
def env(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "  test-key  ")
    monkeypatch.setenv("MODEL_USE_IN_RECOMENDATION", "  gemini-recs  ")
    monkeypatch.setenv("MODEL_USE_IN_TRANSLATION", "  gemini-translate  ")


def test_dependencies_trim_settings_and_build_shared_services(monkeypatch, env):
    client = MagicMock()
    create_client = MagicMock(return_value=client)
    monkeypatch.setattr(genai, "Client", create_client)

    loaded = importlib.reload(ai_dependencies)

    assert loaded.api_key == "test-key"
    assert loaded.model_gemini == "gemini-recs"
    assert loaded.model_translation == "gemini-translate"
    create_client.assert_called_once_with(api_key="test-key")
    assert loaded.gemini_client is client
    assert loaded.translation_service._client is client
    assert loaded.translation_service._model == "gemini-translate"


@pytest.mark.parametrize(
    ("setting", "value", "error"),
    [
        ("GEMINI_API_KEY", "  ", "GEMINI_API_KEY is not configured"),
        (
            "MODEL_USE_IN_RECOMENDATION",
            "",
            "MODEL_USE_IN_RECOMENDATION is not configured",
        ),
    ],
)
def test_dependencies_reject_missing_required_settings(
    monkeypatch, env, setting, value, error
):
    monkeypatch.setenv(setting, value)
    with pytest.raises(RuntimeError, match=error):
        importlib.reload(ai_dependencies)
