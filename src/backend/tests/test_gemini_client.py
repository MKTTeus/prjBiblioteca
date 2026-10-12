import pytest

import gemini_client as ai


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


def test_gemini_quota_uses_groq_before_gemini_model_fallback(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    client = FakeClient([ApiError(429), {"text": "gemini reserva"}])
    groq_result = object()
    monkeypatch.setattr(ai, "_generate_groq", lambda **kwargs: groq_result)

    result = ai.generate_content_with_fallback(
        client, model="gemini-2.5-flash", contents="pergunta",
    )

    assert result is groq_result
    assert [call["model"] for call in client.models.calls] == ["gemini-2.5-flash"]


def test_gemini_quota_uses_gemini_model_when_groq_fails(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    client = FakeClient([ApiError(429), {"text": "flash lite"}])
    monkeypatch.setattr(ai, "_generate_groq", lambda **kwargs: (_ for _ in ()).throw(RuntimeError()))

    result = ai.generate_content_with_fallback(
        client, model="gemini-2.5-flash", contents="pergunta",
    )

    assert result == {"text": "flash lite"}
    assert [call["model"] for call in client.models.calls] == [
        "gemini-2.5-flash", "gemini-3.5-flash-lite",
    ]


def test_book_flow_uses_groq_first_and_gemini_as_reserve(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    client = FakeClient([{"text": "gemini"}])
    calls = []
    monkeypatch.setattr(ai, "_generate_groq", lambda **kwargs: (
        calls.append("groq"), (_ for _ in ()).throw(RuntimeError("down"))
    )[1])

    result = ai.generate_content_with_fallback(
        client, model="gemini-3.5-flash-lite", contents="book",
        primary_provider="groq",
    )

    assert result == {"text": "gemini"}
    assert calls == ["groq"]
    assert len(client.models.calls) == 1


def test_transient_gemini_error_does_not_spend_groq_quota(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    client = FakeClient([ApiError(503)])
    called = []
    monkeypatch.setattr(ai, "_generate_groq", lambda **kwargs: called.append(True))

    with pytest.raises(ApiError):
        ai.generate_content_with_fallback(
            client, model="gemini-2.5-flash", contents="pergunta",
        )

    assert called == []
