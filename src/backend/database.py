import logging
import os
from typing import Any

import httpx
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

logger = logging.getLogger(__name__)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


class SupabaseNaoConfigurado:
    """Fallback explícito para importação local, testes e health checks.

    O objeto mantém a mesma superfície mínima usada pelos routers, mas falha
    com uma mensagem clara somente quando uma operação de banco é realmente
    tentada. Isso permite importar `main:app` sem configuração de produção.
    """

    def _indisponivel(self, *_args: Any, **_kwargs: Any):
        raise RuntimeError(
            "Supabase não configurado. Defina SUPABASE_URL e SUPABASE_KEY "
            "antes de executar operações que acessam o banco."
        )

    table = _indisponivel
    rpc = _indisponivel


def _criar_cliente():
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("SUPABASE_URL/SUPABASE_KEY ausentes; usando fallback local")
        return SupabaseNaoConfigurado()
    try:
        cliente = create_client(SUPABASE_URL, SUPABASE_KEY)
        # O HTTP/2 apresentou RemoteProtocolError nas leituras concorrentes
        # da Vercel. Configure apenas a sessão REST, antes de qualquer uso;
        # Auth, Storage e Functions conservam seus clientes e timeouts.
        rest = cliente.postgrest
        sessao_anterior = rest.session
        rest.session = httpx.Client(
            base_url=str(cliente.rest_url),
            headers=rest.headers,
            timeout=rest.timeout,
            follow_redirects=True,
            http2=False,
            verify=True,
        )
        sessao_anterior.close()
        return cliente
    except Exception:
        logger.exception("Falha ao inicializar o cliente Supabase; usando fallback local")
        return SupabaseNaoConfigurado()


def supabase_configurado() -> bool:
    return isinstance(supabase, SupabaseNaoConfigurado) is False


supabase = _criar_cliente()
