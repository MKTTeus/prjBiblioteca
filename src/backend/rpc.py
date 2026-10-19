import logging
from fastapi import HTTPException
from database import supabase

logger = logging.getLogger(__name__)


def _mensagem_operacao(nome: str, params: dict) -> str:
    """Explica qual ação falhou sem devolver detalhes técnicos do banco."""
    if nome == "criar_movimentacao":
        if params.get("p_direto"):
            return "Não foi possível registrar o empréstimo. Confira se ele aparece na lista antes de tentar novamente."
        return "Não foi possível registrar a solicitação de empréstimo. Confira suas solicitações antes de tentar novamente."
    if nome == "transicionar_movimentacao":
        acao = params.get("p_acao")
        textos = {
            "aprovar": "aprovar a solicitação", "rejeitar": "rejeitar a solicitação",
            "retirar": "registrar a retirada", "devolver": "registrar a devolução",
            "renovar": "renovar o empréstimo", "expirar": "atualizar a solicitação vencida",
        }
        operacao = textos.get(acao, "atualizar a movimentação")
        return f"Não foi possível {operacao}. Confira a situação atual antes de repetir a ação."
    operacoes = {
        "salvar_livro": "salvar o cadastro do livro", "excluir_livro": "excluir o livro",
        "salvar_exemplar": "salvar as alterações do exemplar", "adicionar_exemplares": "adicionar exemplares ao acervo",
        "mesclar_catalogo": "mesclar os cadastros", "encerrar_ano_letivo": "encerrar o ano letivo",
        "avaliar_livro": "salvar sua avaliação", "gerar_snapshot_backup": "preparar o backup",
    }
    operacao = operacoes.get(nome)
    if operacao:
        return f"Não foi possível {operacao}. Tente novamente; se continuar, informe a tela e o horário à equipe."
    return "Não foi possível concluir esta ação por uma falha temporária ao salvar os dados. Tente novamente; se continuar, informe a tela e o horário à equipe."

def executar_rpc(nome: str, params: dict):
    try:
        return supabase.rpc(nome, params).execute().data
    except Exception as exc:
        code = str(getattr(exc, 'code', ''))
        if code in ('P0001', '23505', '23503', '23514', '22023'):
            message = (getattr(exc, 'message', None) if code=='P0001' else None) or 'Dados inválidos, duplicados ou incompatíveis com o estado atual'
            raise HTTPException(409 if code != '22023' else 422, message) from exc
        logger.error('Falha na RPC %s code=%s type=%s', nome,code,type(exc).__name__)
        raise HTTPException(503, _mensagem_operacao(nome, params)) from exc
