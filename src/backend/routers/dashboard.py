from datetime import datetime
from fastapi import APIRouter, Depends

from database import supabase
from core import get_optional_user

router = APIRouter()


@router.get("/dashboard-stats")
def dashboard_stats(user=Depends(get_optional_user)):
    try:
        hoje = datetime.utcnow().date()

        livros = supabase.table("Livro").select("idLivro").execute().data or []
        usuarios = supabase.table("Usuario").select("idUsuario").execute().data or []
        movimentacoes = supabase.table("Movimentacao").select("*").execute().data or []
        movimentacao_exemplares = supabase.table("MovimentacaoExemplar").select("*").execute().data or []

        ativos = 0
        pendentes = 0
        atrasados = 0
        devolvidos_hoje = 0
        reservados = 0

        # map movimentacao -> exemplares
        mov_ex_map = {}
        for me in movimentacao_exemplares:
            mov_ex_map.setdefault(me.get("idMovimentacao"), []).append(me)

        for mov in movimentacoes:
            status = (mov.get("movStatus") or "").lower()
            me_list = mov_ex_map.get(mov.get("idMovimentacao"), [])

            if "ativo" in status:
                ativos += 1
                # if any exemplar for this movimentacao is overdue
                for me in me_list:
                    data_prev = me.get("dataPrevistaDevolucao")
                    if data_prev:
                        try:
                            data_dev = datetime.fromisoformat(data_prev).date()
                            if data_dev < hoje and not me.get("dataDevolucao"):
                                atrasados += 1
                                break
                        except:
                            pass

            if status == "pendente":
                pendentes += 1

            # devolvidos hoje (any exemplar devolvido today)
            for me in me_list:
                data_entrega = me.get("dataDevolucao")
                if data_entrega:
                    try:
                        data_ent = datetime.fromisoformat(data_entrega).date()
                        if data_ent == hoje:
                            devolvidos_hoje += 1
                    except:
                        pass

            if status == "reservado":
                reservados += 1

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
        "devolucoesHoje": devolvidos_hoje
    }
