import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from services.translation_service import TranslationService


def make_service(output_text=None, *, model="translation-model"):
    client = Mock()
    client.aio.interactions.create = AsyncMock(
        return_value=SimpleNamespace(output_text=output_text)
    )
    return TranslationService(client=client, model=model), client


@pytest.mark.asyncio
async def test_translate_catalan_content_returns_without_calling_model():
    content = {"product": "Tomàquet"}
    service, client = make_service(model="")

    assert await service.translate(content, "ca-ES") == content
    client.aio.interactions.create.assert_not_awaited()


@pytest.mark.asyncio
async def test_translate_localized_search_term_to_catalan():
    content = {"query": "tomato"}
    service, client = make_service(json.dumps({"query": "tomàquet"}))

    translated = await service.translate(
        content,
        "ca",
        source_language="en-US",
    )

    assert translated == {"query": "tomàquet"}
    prompt = client.aio.interactions.create.await_args.kwargs["input"]
    assert "into Catalan" in prompt
    assert "source content is in English" in prompt
    assert client.aio.interactions.create.await_args.kwargs["model"] == "translation-model"


@pytest.mark.asyncio
async def test_translate_preserves_list_structure():
    content = [{"product": "Tomàquet"}]
    service, _ = make_service(json.dumps([{"product": "Tomato"}]))

    assert await service.translate(content, "en") == [{"product": "Tomato"}]


@pytest.mark.asyncio
async def test_translate_rejects_invalid_target_and_source_languages():
    service, client = make_service()

    with pytest.raises(ValueError, match="Invalid language tag"):
        await service.translate({}, "not a language")
    with pytest.raises(ValueError, match="Invalid source language tag"):
        await service.translate({}, "ca", source_language="not a language")

    client.aio.interactions.create.assert_not_awaited()


@pytest.mark.asyncio
async def test_translate_requires_a_configured_model_for_non_catalan_content():
    service, client = make_service(model="")

    with pytest.raises(RuntimeError, match="MODEL_USE_IN_TRANSLATION is not configured"):
        await service.translate({"product": "Tomàquet"}, "en")

    client.aio.interactions.create.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("response_text", "error"),
    [
        (None, "empty response"),
        ("not-json", "Expecting value"),
        ('"different structure"', "changed the JSON structure type"),
    ],
)
async def test_translate_rejects_empty_invalid_or_wrong_structure(response_text, error):
    service, _ = make_service(response_text)

    with pytest.raises((RuntimeError, json.JSONDecodeError), match=error):
        await service.translate({"product": "Tomàquet"}, "en")
