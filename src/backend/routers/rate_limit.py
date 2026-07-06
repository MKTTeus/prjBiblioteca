import threading
import time
from typing import Dict

from fastapi import HTTPException, Request

_lock = threading.Lock()
# chave -> lista de timestamps (segundos) das tentativas dentro da janela
_tentativas: Dict[str, list] = {}


def _client_ip(request: Request) -> str:
    # Atrás de proxy (Vercel/Railway), o IP real vem em X-Forwarded-For
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "desconhecido"


def checar_rate_limit(chave: str, max_tentativas: int, janela_segundos: int) -> None:
    """Levanta HTTPException 429 se `chave` já tiver `max_tentativas` dentro
    dos últimos `janela_segundos`. Caso contrário, registra mais uma tentativa."""
    agora = time.time()
    with _lock:
        tentativas = _tentativas.setdefault(chave, [])
        # descarta tentativas fora da janela
        tentativas[:] = [t for t in tentativas if agora - t < janela_segundos]

        if len(tentativas) >= max_tentativas:
            raise HTTPException(
                status_code=429,
                detail="Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
            )

        tentativas.append(agora)


def limitar_login(request: Request, email: str) -> None:
    """No máximo 5 tentativas de login por (IP + e-mail) a cada 5 minutos."""
    chave = f"login:{_client_ip(request)}:{(email or '').strip().lower()}"
    checar_rate_limit(chave, max_tentativas=5, janela_segundos=5 * 60)


def limitar_signup(request: Request) -> None:
    """No máximo 5 cadastros por IP a cada 1 hora."""
    chave = f"signup:{_client_ip(request)}"
    checar_rate_limit(chave, max_tentativas=5, janela_segundos=60 * 60)