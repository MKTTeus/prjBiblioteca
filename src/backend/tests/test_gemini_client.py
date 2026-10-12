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


def test_groq_request_keeps_prompt_and_schema_private_from_logs(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-secret")
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": '{"ok": true}'}}]}

    class FakeHTTPClient:
        def __init__(self, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, **kwargs):
            captured["url"] = url
            captured.update(kwargs)
            return FakeResponse()

    monkeypatch.setattr(ai.httpx, "Client", FakeHTTPClient)
    config = type("Config", (), {
        "system_instruction": "system prompt",
        "temperature": 0.2,
        "max_output_tokens": 100,
        "response_mime_type": "application/json",
        "response_json_schema": {"type": "object", "required": ["ok"]},
    })()

    result = ai._generate_groq(contents="ISBN 123", config=config)

    assert result.text == '{"ok": true}'
    assert captured["url"] == "https://api.groq.com/openai/v1/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer test-secret"
    assert "ISBN 123" in captured["json"]["messages"][-1]["content"]
    assert "system prompt" in captured["json"]["messages"][0]["content"]
    assert captured["json"]["response_format"] == {"type": "json_object"}
