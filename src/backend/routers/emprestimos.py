from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin, get_admin_id, get_optional_user
from schemas import Emprestimo

router = APIRouter()


@router.get("/emprestimos")
def listar_emprestimos(user=Depends(get_optional_user)):
    try:
        hoje = datetime.utcnow().date()
        query = supabase.table("EmprestimoLivro").select("*")

        if user and user.get("tipo") == "usuario":
            usuario_resp = supabase.table("Usuario").select("idUsuario").eq("usuEmail", user["sub"]).execute()
            if not usuario_resp.data:
                raise HTTPException(status_code=404, detail="Usuário não encontrado")

            id_usuario = usuario_resp.data[0]["idUsuario"]
            query = query.eq("idUsuario", id_usuario)

        emprestimos = query.execute().data or []
        exemplar_ids = [emp["idExemplar"] for emp in emprestimos if emp.get("idExemplar")]
        exemplares = []
        livros = []

        if exemplar_ids:
            exemplares = supabase.table("ExemplarLivro").select("idExemplar, exeLivTombo, idLivro").in_("idExemplar", exemplar_ids).execute().data or []
            livro_ids = list({ex["idLivro"] for ex in exemplares if ex.get("idLivro")})
            if livro_ids:
                livros = supabase.table("Livro").select("idLivro, livTitulo").in_("idLivro", livro_ids).execute().data or []

        livro_map = {l["idLivro"]: l["livTitulo"] for l in livros}
        exemplar_map = {e["idExemplar"]: e for e in exemplares}

        for emp in emprestimos:
            data_prev = emp.get("empLiv_DataPrevistaDevolucao")
            if emp.get("empLiv_Status") == "Ativo" and data_prev:
                try:
                    data_prevista = datetime.fromisoformat(data_prev).date()
                    if data_prevista < hoje:
                        emp["empLiv_Status"] = "Atrasado"
                except:
                    pass

            exemplar = exemplar_map.get(emp.get("idExemplar"))
            if exemplar:
                emp["codigo"] = exemplar.get("exeLivTombo")
                emp["titulo"] = livro_map.get(exemplar.get("idLivro"), emp.get("titulo"))

            emp["dataEmprestimo"] = emp.get("empLiv_DataEmprestimo")
            emp["dataDevolucao"] = emp.get("empLiv_DataPrevistaDevolucao") or emp.get("empLiv_DataDevolucao")
            emp["status"] = (emp.get("empLiv_Status") or "").lower()
            emp["renovacoes"] = emp.get("empLiv_Renovacoes", 0)

        return emprestimos
    except Exception as e:
        print("Erro emprestimos:", e)
        return []


@router.get("/emprestimos/notificacoes-admin")
def notificacoes_admin(admin=Depends(get_admin)):
    try:
        agora = datetime.utcnow()
        hoje = agora.date()
        limite_24h = agora - timedelta(hours=24)

        emprestimos_resp = supabase.table("EmprestimoLivro").select(
            "idEmprestimo, idUsuario, idExemplar, empLiv_DataPrevistaDevolucao, empLiv_DataEmprestimo, empLiv_DataDevolucao"
        ).execute()
        emprestimos = emprestimos_resp.data or []

        usuario_ids = list({emp["idUsuario"] for emp in emprestimos if emp.get("idUsuario")})
        exemplar_ids = list({emp["idExemplar"] for emp in emprestimos if emp.get("idExemplar")})

        usuarios = []
        if usuario_ids:
            usuarios = supabase.table("Usuario").select(
                "idUsuario, usuNome, usuRA, usuCPF, usuTelefone, usuTipo"
            ).in_("idUsuario", usuario_ids).execute().data or []

        exemplares = []
        if exemplar_ids:
            exemplares = supabase.table("ExemplarLivro").select("idExemplar, exeLivTombo, idLivro").in_("idExemplar", exemplar_ids).execute().data or []

        livro_ids = list({ex["idLivro"] for ex in exemplares if ex.get("idLivro")})
        livros = []
        if livro_ids:
            livros = supabase.table("Livro").select("idLivro, livTitulo").in_("idLivro", livro_ids).execute().data or []

        usuario_map = {usuario["idUsuario"]: usuario for usuario in usuarios}
        exemplar_map = {ex["idExemplar"]: ex for ex in exemplares}
        livro_map = {livro["idLivro"]: livro for livro in livros}

        def build_entry(loan):
            usuario = usuario_map.get(loan.get("idUsuario"), {})
            exemplar = exemplar_map.get(loan.get("idExemplar"), {})
            livro = livro_map.get(exemplar.get("idLivro"), {})
            document = usuario.get("usuRA") or usuario.get("usuCPF") or "N/A"

            return {
                "id": loan.get("idEmprestimo"),
                "userName": usuario.get("usuNome") or "Usuário desconhecido",
                "userDocument": document,
                "telefone": usuario.get("usuTelefone") or "-",
                "userType": usuario.get("usuTipo") or "Aluno",
                "bookTitle": livro.get("livTitulo") or "Livro desconhecido",
                "tombo": exemplar.get("exeLivTombo") or "-",
                "loanDate": loan.get("empLiv_DataEmprestimo"),
            }

        atrasados_alunos = []
        atrasados_comunidade = []
        recentes = []
        devolucoes_recentes = []

        for emp in emprestimos:
            data_prevista = None
            data_emprestimo = None
            data_devolucao = None

            if emp.get("empLiv_DataPrevistaDevolucao"):
                try:
                    data_prevista = datetime.fromisoformat(emp["empLiv_DataPrevistaDevolucao"])
                except:
                    data_prevista = None

            if emp.get("empLiv_DataEmprestimo"):
                try:
                    data_emprestimo = datetime.fromisoformat(emp["empLiv_DataEmprestimo"])
                except:
                    data_emprestimo = None

            if emp.get("empLiv_DataDevolucao"):
                try:
                    data_devolucao = datetime.fromisoformat(emp["empLiv_DataDevolucao"])
                except:
                    data_devolucao = None

            if data_prevista and data_prevista.date() < hoje and not data_devolucao:
                entry = build_entry(emp)
                if entry["userType"] == "Comunidade":
                    atrasados_comunidade.append(entry)
                else:
                    atrasados_alunos.append(entry)

            if data_emprestimo and data_emprestimo >= limite_24h and not data_devolucao:
                recentes.append(build_entry(emp))

            if data_devolucao and data_devolucao >= limite_24h:
                devolucoes_recentes.append(build_entry(emp))

        recentes.sort(
            key=lambda loan: loan.get("loanDate") or "",
            reverse=True,
        )

        devolucoes_recentes.sort(
            key=lambda loan: loan.get("loanDate") or "",
            reverse=True,
        )

        return {
            "atrasadosAlunos": atrasados_alunos,
            "atrasadosComunidade": atrasados_comunidade,
            "recentes": recentes,
            "devolucoesRecentes": devolucoes_recentes,
        }
    except Exception as e:
        print("Erro notificacoes admin:", e)
        raise HTTPException(status_code=500, detail="Erro ao buscar notificações de empréstimos")


@router.post("/emprestimos")
def criar_emprestimo(data: Emprestimo, admin=Depends(get_admin)):
    try:
        # Validar usuário ativo
        usuario_resp = supabase.table("Usuario").select("usuStatus").eq("idUsuario", data.idUsuario).limit(1).execute()
        if not usuario_resp.data or not usuario_resp.data[0]["usuStatus"]:
            raise HTTPException(status_code=400, detail="Usuário inativo não pode realizar empréstimos")

        # Validar exemplar disponível e não desativado
        exemplar_resp = supabase.table("ExemplarLivro").select("exeLivStatus").eq("idExemplar", data.idExemplar).limit(1).execute()
        status = exemplar_resp.data[0]["exeLivStatus"] if exemplar_resp.data else None
        if not status or status != "Disponível" or "desativado" in status.lower():
            raise HTTPException(status_code=400, detail="Exemplar desativado ou não disponível para empréstimo")

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
    except HTTPException:
        raise
    except Exception as e:
        print("Erro criar emprestimo:", e)
        raise HTTPException(status_code=500, detail="Erro ao criar empréstimo")


@router.get("/exemplares/disponiveis")
def exemplares_disponiveis():
    try:
        exemplares = (
            supabase
            .table("ExemplarLivro")
            .select("idExemplar, exeLivTombo, idLivro")
            .ilike("exeLivStatus", "%Disponível%")
            .not_ilike("exeLivStatus", "%desativado%")
            .execute()
            .data or []
        )

        livros = supabase.table("Livro").select("idLivro, livTitulo").execute().data or []
        mapa_livros = {l["idLivro"]: l["livTitulo"] for l in livros}

        return [
            {
                "id": ex["idExemplar"],
                "tombo": ex["exeLivTombo"],
                "nome": mapa_livros.get(ex["idLivro"], "Livro"),
            }
            for ex in exemplares
        ]
    except Exception as e:
        print("Erro exemplares disponiveis:", e)
        return []


@router.get("/exemplares")
def listar_exemplares():
    try:
        exemplares = supabase.table("ExemplarLivro") \
            .select("idExemplar, exeLivTombo, idLivro") \
            .execute().data or []

        livros = supabase.table("Livro").select("idLivro, livTitulo").execute().data or []
        mapa = {l["idLivro"]: l["livTitulo"] for l in livros}

        return [
            {
                "id": e["idExemplar"],
                "tombo": e["exeLivTombo"],
                "nome": mapa.get(e["idLivro"], "Livro"),
            }
            for e in exemplares
        ]
    except Exception as e:
        print("Erro listar exemplares:", e)
        return []


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
