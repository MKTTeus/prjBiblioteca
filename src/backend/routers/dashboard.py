from fastapi import APIRouter, Depends

from database import supabase
from core import get_optional_user, utc_now

router = APIRouter()


def _contar(query) -> int:
    """Executa uma contagem no PostgREST sem transferir as linhas ao Python."""
    resposta = query.execute()
    count = getattr(resposta, "count", None)
    if count is not None:
        return int(count)
    # Compatibilidade com fakes usados em testes e clientes antigos.
    return len(getattr(resposta, "data", None) or [])


def _contar_itens_ativos(data: str, *, atrasados: bool) -> int:
    query = (
        supabase.table("Movimentacao")
        .select(
            "idMovimentacao, MovimentacaoExemplar!inner(idExemplar)",
            count="exact",
            head=True,
        )
        .eq("movStatus", "Ativo")
        .eq("MovimentacaoExemplar.itemStatus", "Ativo")
        .is_("MovimentacaoExemplar.dataDevolucao", "null")
    )
    query = (
        query.lt("MovimentacaoExemplar.dataPrevistaDevolucao", data)
        if atrasados
        else query.eq("MovimentacaoExemplar.dataPrevistaDevolucao", data)
    )
    resposta = query.execute()
    count = getattr(resposta, "count", None)
    if count is not None:
        return int(count)
    return len(getattr(resposta, "data", None) or [])


@router.get("/dashboard-stats")
def dashboard_stats(user=Depends(get_optional_user)):
    """Retorna os indicadores do painel com contagens executadas no banco."""
    try:
        hoje = utc_now().date().isoformat()
        return {
            "totalLivros": _contar(
                supabase.table("Livro").select("*", count="exact", head=True).eq("livAtivo", True)
            ),
            "totalUsuarios": _contar(
                supabase.table("Usuario").select("*", count="exact", head=True).eq("usuExcluido", False)
            ),
            "emprestimosAtivos": _contar(
                supabase.table("Movimentacao").select("*", count="exact", head=True).eq("movStatus", "Ativo")
            ),
            "devolucoesPendentes": _contar(
                supabase.table("Movimentacao").select("*", count="exact", head=True).eq("movStatus", "Pendente")
            ),
            "reservados": _contar(
                supabase.table("Exemplar").select("*", count="exact", head=True).eq("exeLivStatus", "Reservado")
            ),
            "atrasados": _contar_itens_ativos(hoje, atrasados=True),
            "devolucoesHoje": _contar_itens_ativos(hoje, atrasados=False),
        }
    except Exception as e:
        print("Erro dashboard:", e)
        return {
            "totalLivros": 0,
            "totalUsuarios": 0,
            "emprestimosAtivos": 0,
            "devolucoesPendentes": 0,
            "reservados": 0,
            "atrasados": 0,
            "devolucoesHoje": 0,
        }
