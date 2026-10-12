import pytest

from gemini_client import generate_content_with_fallback


class ApiError(Exception):
    def __init__(self, code):
        self.code = code


class FakeModels:
    def __init__(self, results):
        self.results = iter(results)
        self.calls = []

    def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        result = next(self.results)
        if isinstance(result, Exception):
            raise result
        return result


class FakeClient:
    def __init__(self, results):
        self.models = FakeModels(results)


def test_quota_error_retries_once_with_fallback_model(monkeypatch):
    monkeypatch.delenv("GEMINI_FALLBACK_MODEL", raising=False)
    client = FakeClient([ApiError(429), {"text": "ok"}])
    config = {"response_mime_type": "application/json"}

    result = generate_content_with_fallback(
        client,
        model="gemini-2.5-flash",
        contents="pergunta",
        config=config,
    )

    assert result == {"text": "ok"}
    assert [call["model"] for call in client.models.calls] == [
        "gemini-2.5-flash",
        "gemini-3.5-flash-lite",
    ]
    assert all(call["contents"] == "pergunta" for call in client.models.calls)
    assert all(call["config"] is config for call in client.models.calls)


def test_non_quota_error_does_not_use_fallback():
    client = FakeClient([ApiError(503)])

    with pytest.raises(ApiError):
        generate_content_with_fallback(
            client,
            model="gemini-2.5-flash",
            contents="pergunta",
        )

    assert len(client.models.calls) == 1


def test_flash_lite_primary_falls_back_to_flash(monkeypatch):
    monkeypatch.setenv("GEMINI_FALLBACK_MODEL", "gemini-3.5-flash-lite")
    client = FakeClient([ApiError(429), {"text": "ok"}])

    generate_content_with_fallback(
        client,
        model="gemini-3.5-flash-lite",
        contents="livro",
    )

    assert [call["model"] for call in client.models.calls] == [
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash",
    ]
