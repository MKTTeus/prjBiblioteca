from datetime import datetime
from fastapi import APIRouter, Depends

from database import supabase
from core import get_optional_user, buscar_todos

router = APIRouter()


@router.get("/dashboard-stats")
def dashboard_stats(user=Depends(get_optional_user)):
    try:
        hoje = datetime.utcnow().date()

        # As consultas abaixo usam buscar_todos() (paginação via .range()) em vez de
        # .execute() direto, porque o projeto Supabase tem um limite de linhas por
        # requisição (Max Rows) que corta silenciosamente qualquer resultado maior
        # que esse limite — foi isso que fazia "totalLivros" travar em 100 mesmo
        # com mais livros cadastrados no banco.
        livros = buscar_todos(lambda: supabase.table("Livro").select("idLivro").eq("livAtivo", True))
        usuarios = buscar_todos(lambda: supabase.table("Usuario").select("idUsuario").eq("usuExcluido", False))
        movimentacoes = buscar_todos(lambda: supabase.table("Movimentacao").select("*"))
        movimentacao_exemplares = buscar_todos(lambda: supabase.table("MovimentacaoExemplar").select("*"))

        exemplares_reservados = buscar_todos(
            lambda: supabase.table("Exemplar").select("idExemplar").eq("exeLivStatus", "Reservado")
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