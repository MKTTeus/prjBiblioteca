import hashlib
import os
from fastapi import HTTPException, Request
from database import supabase


def _client_ip(request: Request) -> str:
    if os.getenv("VERCEL"):
        # Vercel sobrescreve este header; não confiar em X-Forwarded-For arbitrário.
        return request.headers.get("x-vercel-forwarded-for", "desconhecido").split(",")[0].strip()
    return request.client.host if request.client else "desconhecido"


def checar_rate_limit(chave: str, max_tentativas: int, janela_segundos: int) -> None:
    chave = hashlib.sha256(chave.encode()).hexdigest()
    try:
        permitido = supabase.rpc("registrar_tentativa", {"p_chave": chave, "p_max": max_tentativas, "p_janela": janela_segundos}).execute().data
    except Exception as exc:
        raise HTTPException(503, "Proteção de acesso indisponível") from exc
    if permitido is not True:
        raise HTTPException(429, "Muitas tentativas. Aguarde alguns minutos e tente novamente.")


def limitar_login(request: Request, email: str) -> None:
    checar_rate_limit(f"login-ip:{_client_ip(request)}", 30, 300)
    checar_rate_limit(f"login-conta:{email.strip().lower()}", 5, 300)


def limitar_esqueci_senha(request: Request, email: str) -> None:
    checar_rate_limit(f"reset-ip:{_client_ip(request)}", 15, 900)
    checar_rate_limit(f"reset-conta:{email.strip().lower()}", 3, 900)


def limitar_redefinir_senha(request: Request) -> None:
    checar_rate_limit(f"reset-token:{_client_ip(request)}", 10, 900)
