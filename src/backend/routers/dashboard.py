from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_optional_user, business_today, executar_em_paralelo

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
    query=supabase.table('MovimentacaoExemplar').select('idExemplar',count='exact',head=True).eq('itemStatus','Ativo').is_('dataDevolucao','null')
    query = (
        query.lt("dataPrevistaDevolucao", data)
        if atrasados
        else query.eq("dataPrevistaDevolucao", data)
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
        hoje = business_today().isoformat()
        chaves = (
            "totalLivros", "totalUsuarios", "emprestimosAtivos",
            "devolucoesPendentes", "reservados", "atrasados", "devolucoesHoje",
        )
        valores = executar_em_paralelo(
            lambda: _contar(supabase.table("Livro").select("*", count="exact", head=True).eq("livAtivo", True)),
            lambda: _contar(supabase.table("Usuario").select("*", count="exact", head=True).eq("usuExcluido", False)),
            lambda: _contar(supabase.table("Movimentacao").select("*", count="exact", head=True).eq("movStatus", "Ativo")),
            lambda: _contar(supabase.table("Movimentacao").select("*", count="exact", head=True).eq("movStatus", "Pendente")),
            lambda: _contar(supabase.table("Exemplar").select("*", count="exact", head=True).eq("exeLivStatus", "Reservado")),
            lambda: _contar_itens_ativos(hoje, atrasados=True),
            lambda: _contar_itens_ativos(hoje, atrasados=False),
        )
        return dict(zip(chaves, valores))
    except Exception as e:
        raise HTTPException(503,'Serviço temporariamente indisponível') from e
