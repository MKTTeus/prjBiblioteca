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
        emprestimos = supabase.table("EmprestimoLivro").select("*").execute().data or []

        ativos = 0
        pendentes = 0
        atrasados = 0
        devolvidos_hoje = 0
        reservados = 0

        for emp in emprestimos:
            status = (emp.get("empLiv_Status") or "").lower()
            data_devolucao = emp.get("empLiv_DataPrevistaDevolucao")
            data_entrega = emp.get("empLiv_DataDevolucao")

            if "ativo" in status:
                ativos += 1
                if data_devolucao:
                    try:
                        data_dev = datetime.fromisoformat(data_devolucao).date()
                        if data_dev < hoje:
                            atrasados += 1
                    except:
                        pass

            if status == "pendente":
                pendentes += 1

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
