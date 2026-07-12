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


@router.get("/relatorios/atrasos")
def relatorio_atrasos(
    tipoUsuario: Optional[str] = "todos",  # todos | Aluno | Comunidade
    admin=Depends(get_admin),
):
    """Usuários com empréstimos em atraso (inadimplentes) — um item em atraso
    por linha, agrupável no front por usuário."""
    try:
        hoje = datetime.utcnow().date()

        todos_itens = (
            supabase.table("MovimentacaoExemplar")
            .select("*")
            .execute()
            .data
            or []
        )

        # Só nos interessam os que já passaram da data prevista
        atrasados_raw = []
        for it in todos_itens:
            if it.get("dataDevolucao"):
                continue  # já foi devolvido, não é atraso
            data_prevista = it.get("dataPrevistaDevolucao")
            if not data_prevista:
                continue
            try:
                if datetime.fromisoformat(data_prevista).date() < hoje:
                    atrasados_raw.append(it)
            except Exception:
                continue

        if not atrasados_raw:
            return {"itens": [], "resumo": {"usuariosInadimplentes": 0, "itensAtrasados": 0, "diasAtrasoMedio": 0}}

        movimentacao_ids = list({it["idMovimentacao"] for it in atrasados_raw if it.get("idMovimentacao")})
        exemplar_ids = list({it["idExemplar"] for it in atrasados_raw if it.get("idExemplar")})

        consultas = [
            lambda: supabase.table("Movimentacao").select("idMovimentacao, idUsuario").in_("idMovimentacao", movimentacao_ids).execute()
            if movimentacao_ids else None,
            lambda: supabase.table("Exemplar").select("idExemplar, exeLivTombo, idLivro").in_("idExemplar", exemplar_ids).execute()
            if exemplar_ids else None,
        ]
        resp_mov, resp_exemplares = executar_em_paralelo(*consultas)

        movimentacoes = (resp_mov.data or []) if resp_mov else []
        exemplares = (resp_exemplares.data or []) if resp_exemplares else []

        mov_map = {m["idMovimentacao"]: m for m in movimentacoes}
        exemplar_map = {e["idExemplar"]: e for e in exemplares}

        usuario_ids = list({m.get("idUsuario") for m in movimentacoes if m.get("idUsuario")})
        livro_ids = list({e.get("idLivro") for e in exemplares if e.get("idLivro")})

        consultas2 = [
            lambda: supabase.table("Usuario").select("idUsuario, usuNome, usuTipo, usuEmail, usuTelefone, usuTelefoneResponsavel").in_("idUsuario", usuario_ids).execute()
            if usuario_ids else None,
            lambda: supabase.table("Livro").select("idLivro, livTitulo").in_("idLivro", livro_ids).execute()
            if livro_ids else None,
        ]
        resp_usuarios, resp_livros = executar_em_paralelo(*consultas2)

        usuario_map = {u["idUsuario"]: u for u in (resp_usuarios.data or [])} if resp_usuarios else {}
        livro_map = {l["idLivro"]: l for l in (resp_livros.data or [])} if resp_livros else {}

        itens = []
        soma_dias = 0

        for it in atrasados_raw:
            mov = mov_map.get(it.get("idMovimentacao"), {})
            usuario = usuario_map.get(mov.get("idUsuario"), {})
            usuario_tipo = usuario.get("usuTipo", "-")

            if tipoUsuario and tipoUsuario != "todos" and usuario_tipo != tipoUsuario:
                continue

            exemplar = exemplar_map.get(it.get("idExemplar"), {})
            livro = livro_map.get(exemplar.get("idLivro"), {})

            data_prevista = it.get("dataPrevistaDevolucao")
            try:
                dias_atraso = (hoje - datetime.fromisoformat(data_prevista).date()).days
            except Exception:
                dias_atraso = 0

            soma_dias += dias_atraso

            contato = usuario.get("usuEmail") or usuario.get("usuTelefone") or usuario.get("usuTelefoneResponsavel") or "-"

            itens.append({
                "idUsuario": mov.get("idUsuario"),
                "usuario": usuario.get("usuNome", "Usuário não informado"),
                "usuarioTipo": usuario_tipo,
                "contato": contato,
                "titulo": livro.get("livTitulo", "-"),
                "tombo": exemplar.get("exeLivTombo", "-"),
                "dataPrevistaDevolucao": data_prevista,
                "diasAtraso": dias_atraso,
            })

        itens.sort(key=lambda i: i["diasAtraso"], reverse=True)

        usuarios_inadimplentes = len({i["idUsuario"] for i in itens if i.get("idUsuario")})
        resumo = {
            "usuariosInadimplentes": usuarios_inadimplentes,
            "itensAtrasados": len(itens),
            "diasAtrasoMedio": round(soma_dias / len(itens), 1) if itens else 0,
        }

        return {"itens": itens, "resumo": resumo}
    except Exception as e:
        print("Erro relatorio atrasos:", e)
        return {"itens": [], "resumo": {"usuariosInadimplentes": 0, "itensAtrasados": 0, "diasAtrasoMedio": 0}}


@router.get("/relatorios/acervo")
def relatorio_acervo(
    agrupador: Optional[str] = "categoria",  # categoria | genero
    admin=Depends(get_admin),
):
    """Acervo agrupado por categoria ou por gênero: quantidade de títulos e
    de exemplares (cópias físicas) em cada grupo."""
    try:
        livros = supabase.table("Livro").select("idLivro, livAtivo").eq("livAtivo", True).execute().data or []
        livro_ids = [l["idLivro"] for l in livros]

        if not livro_ids:
            return {"itens": [], "resumo": {"totalLivros": 0, "totalExemplares": 0, "totalGrupos": 0}}

        if agrupador == "genero":
            tabela_vinculo, tabela_grupo, campo_id, campo_nome = "LivroGenero", "Genero", "idGenero", "genNome"
        else:
            agrupador = "categoria"
            tabela_vinculo, tabela_grupo, campo_id, campo_nome = "LivroCategoria", "Categoria", "idCategoria", "catNome"

        consultas = [
            lambda: supabase.table(tabela_vinculo).select(f"idLivro, {tabela_grupo}({campo_id}, {campo_nome})").in_("idLivro", livro_ids).execute(),
            lambda: supabase.table("Exemplar").select("idLivro, exeLivStatus").in_("idLivro", livro_ids).execute(),
        ]
        resp_vinculo, resp_exemplares = executar_em_paralelo(*consultas)

        vinculos = resp_vinculo.data or []
        exemplares = resp_exemplares.data or []

        # quantos exemplares (e quantos disponíveis) cada livro tem
        exemplares_por_livro = {}
        disponiveis_por_livro = {}
        for ex in exemplares:
            lid = ex.get("idLivro")
            exemplares_por_livro[lid] = exemplares_por_livro.get(lid, 0) + 1
            if (ex.get("exeLivStatus") or "").lower() == "disponível":
                disponiveis_por_livro[lid] = disponiveis_por_livro.get(lid, 0) + 1

        # nome do grupo por livro (um livro pode ter só 1 categoria/gênero hoje,
        # mas o vínculo é N:N, então tratamos como lista)
        grupos_por_livro = {}
        for v in vinculos:
            grupo = v.get(tabela_grupo)
            if not grupo:
                continue
            lid = v.get("idLivro")
            grupos_por_livro.setdefault(lid, []).append(grupo.get(campo_nome, "Sem nome"))

        agregados = {}  # nome_grupo -> {"livros": set(idLivro), "exemplares": int, "disponiveis": int}

        for lid in livro_ids:
            nomes = grupos_por_livro.get(lid) or ["Sem categoria" if agrupador == "categoria" else "Sem gênero"]
            for nome in nomes:
                bucket = agregados.setdefault(nome, {"livros": set(), "exemplares": 0, "disponiveis": 0})
                bucket["livros"].add(lid)
                bucket["exemplares"] += exemplares_por_livro.get(lid, 0)
                bucket["disponiveis"] += disponiveis_por_livro.get(lid, 0)

        itens = [
            {
                "grupo": nome,
                "quantidadeLivros": len(dados["livros"]),
                "quantidadeExemplares": dados["exemplares"],
                "quantidadeDisponiveis": dados["disponiveis"],
                "quantidadeEmprestados": dados["exemplares"] - dados["disponiveis"],
            }
            for nome, dados in agregados.items()
        ]
        itens.sort(key=lambda i: i["quantidadeLivros"], reverse=True)

        resumo = {
            "totalLivros": len(livro_ids),
            "totalExemplares": sum(exemplares_por_livro.values()),
            "totalGrupos": len(itens),
        }

        return {"itens": itens, "resumo": resumo, "agrupador": agrupador}
    except Exception as e:
        print("Erro relatorio acervo:", e)
        return {"itens": [], "resumo": {"totalLivros": 0, "totalExemplares": 0, "totalGrupos": 0}, "agrupador": agrupador}