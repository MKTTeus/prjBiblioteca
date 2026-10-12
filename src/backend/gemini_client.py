"""Shared Gemini client with model failover on quota exhaustion."""

import logging
import os

logger = logging.getLogger("biblioteca.gemini")

_DEFAULT_FALLBACKS = {
    "gemini-2.5-flash": "gemini-3.5-flash-lite",
    "gemini-3.5-flash-lite": "gemini-2.5-flash",
}


def create_gemini_client(*, timeout_ms: int = 20_000):
    """Create the configured Gemini client without retrying quota (429) errors."""
    from google import genai
    from google.genai import types

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY não configurada no servidor.")

    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(
            timeout=timeout_ms,
            retry_options=types.HttpRetryOptions(
                attempts=2,
                initial_delay=0.5,
                max_delay=1,
                # Quota 429s do not recover after a short retry; they use the
                # alternate model below. Keep retries for transient failures.
                http_status_codes=[408, 500, 502, 503, 504],
            ),
        ),
    )


def _fallback_for(model: str, fallback_model: str | None) -> str | None:
    configured = (
        fallback_model
        or os.getenv("GEMINI_FALLBACK_MODEL")
        or _DEFAULT_FALLBACKS.get(model)
    )
    if configured and configured != model:
        return configured
    # If the configured default equals the selected primary, use the
    # complementary model when it is one of the two supported defaults.
    alternative = _DEFAULT_FALLBACKS.get(model)
    return alternative if alternative != model else None


def generate_content_with_fallback(
    client,
    *,
    model: str,
    contents,
    config=None,
    fallback_model: str | None = None,
):
    """Use a secondary model only when the primary returns HTTP 429."""
    try:
        return client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
    except Exception as exc:
        if getattr(exc, "code", None) != 429:
            raise

        alternative = _fallback_for(model, fallback_model)
        if not alternative:
            raise

        logger.warning(
            "Cota Gemini do modelo principal atingida; usando modelo reserva. "
            "principal=%s reserva=%s",
            model,
            alternative,
        )
        return client.models.generate_content(
            model=alternative,
            contents=contents,
            config=config,
        )
