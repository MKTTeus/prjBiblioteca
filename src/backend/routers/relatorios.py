from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends

from database import supabase
from core import get_admin, executar_em_paralelo

router = APIRouter()


@router.get("/relatorios/emprestimos")
def relatorio_emprestimos(
    dataInicio: Optional[str] = None,
    dataFim: Optional[str] = None,
    status: Optional[str] = "todos",       # todos | ativo | atrasado | devolvido
    tipoUsuario: Optional[str] = "todos",  # todos | Aluno | Comunidade
    admin=Depends(get_admin),
):
    try:
        hoje = datetime.utcnow().date()

        query = supabase.table("Movimentacao").select("*").eq("movTipo", "EMPRESTIMO")
        if dataInicio:
            query = query.gte("movDataEmprestimo", dataInicio)
        if dataFim:
            query = query.lte("movDataEmprestimo", dataFim)

        movimentacoes = query.execute().data or []

        movimentacao_ids = [m["idMovimentacao"] for m in movimentacoes if m.get("idMovimentacao")]
        usuario_ids = list({m.get("idUsuario") for m in movimentacoes if m.get("idUsuario")})

        consultas = []
        if movimentacao_ids:
            consultas.append(
                lambda: supabase.table("MovimentacaoExemplar").select("*").in_("idMovimentacao", movimentacao_ids).execute()
            )
        else:
            consultas.append(lambda: None)
        if usuario_ids:
            consultas.append(
                lambda: supabase.table("Usuario").select("idUsuario, usuNome, usuTipo").in_("idUsuario", usuario_ids).execute()
            )
        else:
            consultas.append(lambda: None)

        resp_mov_ex, resp_usuarios = executar_em_paralelo(*consultas)

        movimentacao_exemplares = (resp_mov_ex.data or []) if resp_mov_ex else []
        usuario_map = {u["idUsuario"]: u for u in (resp_usuarios.data or [])} if resp_usuarios else {}

        mov_ex_map = {}
        exemplar_ids = []
        for me in movimentacao_exemplares:
            mov_ex_map.setdefault(me["idMovimentacao"], []).append(me)
            if me.get("idExemplar"):
                exemplar_ids.append(me["idExemplar"])

        exemplares = []
        livros = []
        if exemplar_ids:
            exemplares = supabase.table("Exemplar").select("idExemplar, exeLivTombo, idLivro").in_("idExemplar", list(set(exemplar_ids))).execute().data or []
            livro_ids = list({ex.get("idLivro") for ex in exemplares if ex.get("idLivro")})
            if livro_ids:
                livros = supabase.table("Livro").select("idLivro, livTitulo, livISBN").in_("idLivro", livro_ids).execute().data or []

        livro_map = {l["idLivro"]: l for l in livros}
        exemplar_map = {e["idExemplar"]: e for e in exemplares}

        itens = []
        resumo = {"ativos": 0, "atrasados": 0, "devolvidos": 0, "total": 0}

        for mov in movimentacoes:
            u = usuario_map.get(mov.get("idUsuario"), {})
            usuario_nome = u.get("usuNome", "Usuário não informado")
            usuario_tipo = u.get("usuTipo", "-")

            if tipoUsuario and tipoUsuario != "todos" and usuario_tipo != tipoUsuario:
                continue

            me_list = mov_ex_map.get(mov.get("idMovimentacao"), [])
            exemplar = me_list[0] if me_list else None

            titulo = None
            isbn = None
            tombo = None
            data_devolucao = None
            data_prevista = None
            renovacoes = 0

            if exemplar:
                ex = exemplar_map.get(exemplar.get("idExemplar"))
                if ex:
                    tombo = ex.get("exeLivTombo")
                    info_livro = livro_map.get(ex.get("idLivro"), {})
                    titulo = info_livro.get("livTitulo")
                    isbn = info_livro.get("livISBN")
                data_devolucao = exemplar.get("dataDevolucao")
                data_prevista = exemplar.get("dataPrevistaDevolucao")
                renovacoes = exemplar.get("renovacoes", 0)

            item_status_lower = (exemplar.get("itemStatus") or "").lower() if exemplar else ""
            mov_status_lower = (mov.get("movStatus") or "").lower()

            if data_devolucao:
                status_calc = "devolvido"
            elif item_status_lower == "ativo" or (not exemplar and mov_status_lower == "ativo"):
                if data_prevista:
                    try:
                        if datetime.fromisoformat(data_prevista).date() < hoje:
                            status_calc = "atrasado"
                        else:
                            status_calc = "ativo"
                    except Exception:
                        status_calc = "ativo"
                else:
                    status_calc = "ativo"
            else:
                status_calc = mov_status_lower or "ativo"

            if status and status != "todos" and status_calc != status:
                continue

            resumo["total"] += 1
            if status_calc in resumo:
                resumo[status_calc] += 1

            itens.append({
                "idMovimentacao": mov.get("idMovimentacao"),
                "usuario": usuario_nome,
                "usuarioTipo": usuario_tipo,
                "titulo": titulo or "-",
                "isbn": isbn,
                "tombo": tombo,
                "dataEmprestimo": mov.get("movDataEmprestimo"),
                "dataPrevistaDevolucao": data_prevista,
                "dataDevolucao": data_devolucao,
                "renovacoes": renovacoes,
                "status": status_calc,
            })

        itens.sort(key=lambda i: i.get("dataEmprestimo") or "", reverse=True)

        return {"itens": itens, "resumo": resumo}
    except Exception as e:
        print("Erro relatorio emprestimos:", e)
        return {"itens": [], "resumo": {"ativos": 0, "atrasados": 0, "devolvidos": 0, "total": 0}}