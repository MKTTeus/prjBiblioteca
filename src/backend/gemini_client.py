"""AI client with Gemini/Groq provider fallback for cataloguing and Novi."""

import json
import logging
import os
from types import SimpleNamespace

import httpx

logger = logging.getLogger("biblioteca.ai")

_DEFAULT_FALLBACKS = {
    "gemini-2.5-flash": "gemini-3.5-flash-lite",
    "gemini-3.5-flash-lite": "gemini-2.5-flash",
}


def create_gemini_client(*, timeout_ms: int = 20_000):
    """Create a Gemini client when configured; Groq-only deployments are valid."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    from google import genai
    from google.genai import types

    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(
            timeout=timeout_ms,
            retry_options=types.HttpRetryOptions(
                attempts=2,
                initial_delay=0.5,
                max_delay=1,
                # Quota 429s use another provider/model instead of a short retry.
                http_status_codes=[408, 500, 502, 503, 504],
            ),
        ),
    )


def _fallback_for(model: str, fallback_model: str | None) -> str | None:
    configured = fallback_model or os.getenv("GEMINI_FALLBACK_MODEL") or _DEFAULT_FALLBACKS.get(model)
    if configured and configured != model:
        return configured
    alternative = _DEFAULT_FALLBACKS.get(model)
    return alternative if alternative != model else None


def _generate_gemini(client, *, model: str, contents, config=None):
    if client is None:
        raise RuntimeError("GEMINI_API_KEY não configurada no servidor.")
    return client.models.generate_content(model=model, contents=contents, config=config)


def _generate_groq(*, contents, config=None):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY não configurada no servidor.")

    system = getattr(config, "system_instruction", None) if config is not None else None
    temperature = getattr(config, "temperature", None) if config is not None else None
    max_tokens = getattr(config, "max_output_tokens", None) if config is not None else None
    messages = []
    if system:
        messages.append({"role": "system", "content": str(system)})
    user_content = contents if isinstance(contents, str) else json.dumps(contents, ensure_ascii=False)
    schema = getattr(config, "response_json_schema", None) if config is not None else None
    if schema:
        user_content += "\n\nResponda conforme este schema JSON:\n" + json.dumps(schema, ensure_ascii=False)
    messages.append({"role": "user", "content": user_content})

    request = {
        "model": os.getenv("GROQ_MODEL", "openai/gpt-oss-20b"),
        "messages": messages,
    }
    if temperature is not None:
        request["temperature"] = temperature
    if max_tokens is not None:
        request["max_completion_tokens"] = max_tokens
    if config is not None and getattr(config, "response_mime_type", None) == "application/json":
        # Groq JSON mode guarantees valid JSON; callers still validate and
        # safely handle fields because it does not enforce Gemini's full schema.
        request["response_format"] = {"type": "json_object"}

    with httpx.Client(timeout=float(os.getenv("AI_PROVIDER_TIMEOUT_SECONDS", "20"))) as client:
        response = client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json=request,
        )
        response.raise_for_status()
        body = response.json()
    choices = body.get("choices") or []
    text = choices[0].get("message", {}).get("content") if choices else None
    if not isinstance(text, str) or not text.strip():
        raise RuntimeError("Groq não retornou conteúdo.")
    return SimpleNamespace(text=text)


def _log_fallback(provider: str, exc: Exception) -> None:
    status = getattr(exc, "code", None)
    if not isinstance(status, int):
        response = getattr(exc, "response", None)
        status = getattr(response, "status_code", None)
    if not isinstance(status, int):
        status = None
    logger.warning("Falha no provedor %s; acionando reserva. tipo=%s status=%s",
                   provider, type(exc).__name__, status)


def generate_content_with_fallback(
    client,
    *,
    model: str,
    contents,
    config=None,
    fallback_model: str | None = None,
    primary_provider: str = "gemini",
):
    """Call Groq first for high-volume jobs, or use it after Gemini quota errors.

    Gemini -> Groq is triggered only for HTTP 429. Groq-primary cataloguing
    falls back to Gemini on provider/network errors. No prompts are logged.
    """
    groq_configured = bool(os.getenv("GROQ_API_KEY"))
    if primary_provider == "groq" and groq_configured:
        try:
            return _generate_groq(contents=contents, config=config)
        except Exception as exc:
            _log_fallback("Groq", exc)
            try:
                return _generate_gemini(client, model=model, contents=contents, config=config)
            except Exception as gemini_exc:
                if getattr(gemini_exc, "code", None) != 429:
                    raise
                alternative = _fallback_for(model, fallback_model)
                if alternative:
                    return _generate_gemini(client, model=alternative, contents=contents, config=config)
                raise

    primary_exc = None
    if client is None and groq_configured:
        return _generate_groq(contents=contents, config=config)

    try:
        return _generate_gemini(client, model=model, contents=contents, config=config)
    except Exception as exc:
        if getattr(exc, "code", None) != 429:
            raise
        primary_exc = exc

    if groq_configured:
        try:
            return _generate_groq(contents=contents, config=config)
        except Exception as exc:
            _log_fallback("Groq", exc)

    alternative = _fallback_for(model, fallback_model)
    if alternative:
        return _generate_gemini(client, model=alternative, contents=contents, config=config)
    if primary_exc is not None:
        raise primary_exc
    raise RuntimeError("Nenhum provedor de IA está configurado.")
