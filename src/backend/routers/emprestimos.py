from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin, get_admin_id
from schemas import Emprestimo

router = APIRouter()


@router.get("/emprestimos")
def listar_emprestimos(admin=Depends(get_admin)):
    try:
        hoje = datetime.utcnow().date()
        emprestimos = supabase.table("EmprestimoLivro").select("*").execute().data or []

        for emp in emprestimos:
            data_prev = emp.get("empLiv_DataPrevistaDevolucao")
            if emp["empLiv_Status"] == "Ativo" and data_prev:
                try:
                    data_prevista = datetime.fromisoformat(data_prev).date()
                    if data_prevista < hoje:
                        emp["empLiv_Status"] = "Atrasado"
                except:
                    pass

        return emprestimos
    except Exception as e:
        print("Erro emprestimos:", e)
        return []


@router.post("/emprestimos")
def criar_emprestimo(data: Emprestimo, admin=Depends(get_admin)):
    try:
        hoje = datetime.utcnow().date()

        config = supabase.table("configuracoes").select("dias_emprestimo").limit(1).execute()
        dias = config.data[0]["dias_emprestimo"] if config.data else 14

        vencimento = hoje + timedelta(days=dias)
        id_admin = get_admin_id(admin)
        novo = {
            "idAdmin": id_admin,
            "idUsuario": data.idUsuario,
            "idExemplar": data.idExemplar,
            "empLiv_DataEmprestimo": hoje.isoformat(),
            "empLiv_DataPrevistaDevolucao": vencimento.isoformat(),
            "empLiv_Status": "Ativo"
        }

        emp = supabase.table("EmprestimoLivro").insert(novo).execute()
        supabase.table("ExemplarLivro").update({
            "exeLivStatus": "Emprestado"
        }).eq("idExemplar", data.idExemplar).execute()

        return emp.data[0]
    except Exception as e:
        print("Erro criar emprestimo:", e)
        raise HTTPException(status_code=500, detail="Erro ao criar empréstimo")


@router.put("/emprestimos/{idEmprestimo}/devolver")
def devolver_emprestimo(idEmprestimo: int, admin=Depends(get_admin)):
    try:
        hoje = datetime.utcnow().date()

        emp = supabase.table("EmprestimoLivro").update({
            "empLiv_Status": "Devolvido",
            "empLiv_DataDevolucao": hoje.isoformat()
        }).eq("idEmprestimo", idEmprestimo).execute()

        if not emp.data:
            raise HTTPException(status_code=404, detail="Não encontrado")

        idExemplar = emp.data[0]["idExemplar"]

        supabase.table("ExemplarLivro").update({
            "exeLivStatus": "Disponível"
        }).eq("idExemplar", idExemplar).execute()

        return {"message": "Devolvido com sucesso"}
    except Exception as e:
        print("Erro devolver:", e)
        raise HTTPException(status_code=500, detail="Erro ao devolver")
