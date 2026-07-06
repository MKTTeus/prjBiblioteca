from datetime import datetime
from fastapi import APIRouter, Depends

from database import supabase
from core import get_optional_user

router = APIRouter()


@router.get("/dashboard-stats")
def dashboard_stats(user=Depends(get_optional_user)):
    try:
        hoje = datetime.utcnow().date()

        livros = supabase.table("Livro").select("idLivro").eq("livAtivo", True).execute().data or []
        usuarios = supabase.table("Usuario").select("idUsuario").eq("usuExcluido", False).execute().data or []
        movimentacoes = supabase.table("Movimentacao").select("*").execute().data or []
        movimentacao_exemplares = supabase.table("MovimentacaoExemplar").select("*").execute().data or []

        exemplares_reservados = (
            supabase.table("Exemplar").select("idExemplar").eq("exeLivStatus", "Reservado").execute().data or []
        )
        reservados = len(exemplares_reservados)

        ativos = 0
        pendentes = 0
        atrasados = 0
        vencem_hoje = 0

        # map movimentacao -> exemplares
        mov_ex_map = {}
        for me in movimentacao_exemplares:
            mov_ex_map.setdefault(me.get("idMovimentacao"), []).append(me)

        for mov in movimentacoes:
            status = (mov.get("movStatus") or "").lower()
            me_list = mov_ex_map.get(mov.get("idMovimentacao"), [])

            if "ativo" in status:
                ativos += 1
                mov_atrasado = False
                mov_vence_hoje = False
                for me in me_list:
                    if me.get("dataDevolucao"):
                        continue
                    data_prev = me.get("dataPrevistaDevolucao")
                    if not data_prev:
                        continue
                    try:
                        data_dev = datetime.fromisoformat(data_prev).date()
                    except Exception:
                        continue
                    if data_dev < hoje:
                        mov_atrasado = True
                    elif data_dev == hoje:
                        mov_vence_hoje = True
                if mov_atrasado:
                    atrasados += 1
                elif mov_vence_hoje:
                    vencem_hoje += 1

            if status == "pendente":
                pendentes += 1

    except Exception as e:
        print("Erro dashboard:", e)
        return {
            "totalLivros": 0,
            "totalUsuarios": 0,
            "emprestimosAtivos": 0,
            "devolucoesPendentes": 0,
            "reservados": 0,
            "atrasados": 0,
            "devolucoesHoje": 0
        }

    return {
        "totalLivros": len(livros),
        "totalUsuarios": len(usuarios),
        "emprestimosAtivos": ativos,
        "devolucoesPendentes": pendentes,
        "reservados": reservados,
        "atrasados": atrasados,
        "devolucoesHoje": vencem_hoje
    }