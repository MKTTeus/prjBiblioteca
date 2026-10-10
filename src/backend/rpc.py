import logging
from fastapi import HTTPException
from database import supabase

logger = logging.getLogger(__name__)

def executar_rpc(nome: str, params: dict):
    try:
        return supabase.rpc(nome, params).execute().data
    except Exception as exc:
        code = str(getattr(exc, 'code', ''))
        if code in ('P0001', '23505', '23503', '23514', '22023'):
            message = (getattr(exc, 'message', None) if code=='P0001' else None) or 'Dados inválidos, duplicados ou incompatíveis com o estado atual'
            raise HTTPException(409 if code != '22023' else 422, message) from exc
        logger.error('Falha na RPC %s code=%s type=%s', nome,code,type(exc).__name__)
        raise HTTPException(503, 'Não foi possível concluir a operação. Tente novamente.') from exc
