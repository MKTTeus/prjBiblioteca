from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_professor, get_admin_id
from schemas import EmprestimoProfessorCreate, DevolucaoProfessor
from routers.emprestimos import get_config_map, get_config_days

router = APIRouter()

FINALIDADES_VALIDAS = {"PESSOAL", "TURMA"}


def _liberar_exemplares(ids):
    """Devolve exemplares reservados ao status Disponível (rollback)."""
    if not ids:
        return
    try:
        supabase.table("Exemplar").update({"exeLivStatus": "Disponível"}).in_("idExemplar", ids).execute()
    except Exception as e:
        print("Erro ao liberar exemplares após falha:", e)


def _montar_emprestimos_professor(id_admin_professor: int, id_movimentacao: int = None):
    """Monta a lista (ou um item) de empréstimos do professor, já agregando
    os exemplares de cada movimentação por livro (ativos/devolvidos)."""
    query = (
        supabase.table("Movimentacao")
        .select("*")
        .eq("idAdmin", id_admin_professor)
        .not_.is_("movFinalidade", "null")
    )
    if id_movimentacao is not None:
        query = query.eq("idMovimentacao", id_movimentacao)
    movimentacoes = query.execute().data or []
    if not movimentacoes:
        return []

    hoje = datetime.utcnow().date()
    mov_ids = [m["idMovimentacao"] for m in movimentacoes]

    itens = supabase.table("MovimentacaoExemplar").select("*").in_("idMovimentacao", mov_ids).execute().data or []
    exemplar_ids = list({i["idExemplar"] for i in itens if i.get("idExemplar")})

    exemplar_livro_map = {}
    livro_titulo_map = {}
    if exemplar_ids:
        exemplares = supabase.table("Exemplar").select("idExemplar, idLivro").in_("idExemplar", exemplar_ids).execute().data or []
        exemplar_livro_map = {e["idExemplar"]: e["idLivro"] for e in exemplares}
        livro_ids = list({lid for lid in exemplar_livro_map.values() if lid})
        if livro_ids:
            livros = supabase.table("Livro").select("idLivro, livTitulo").in_("idLivro", livro_ids).execute().data or []
            livro_titulo_map = {l["idLivro"]: l["livTitulo"] for l in livros}

    itens_por_mov = {}
    for it in itens:
        itens_por_mov.setdefault(it["idMovimentacao"], []).append(it)

    resultado = []
    for mov in movimentacoes:
        mov_itens = itens_por_mov.get(mov["idMovimentacao"], [])
        por_livro = {}
        data_prevista_mov = None
        tem_ativo = False
        tem_atrasado = False
        total_devolvidos = 0

        for it in mov_itens:
            id_livro = exemplar_livro_map.get(it.get("idExemplar"))
            if id_livro is None:
                continue
            entrada = por_livro.setdefault(id_livro, {
                "idLivro": id_livro,
                "titulo": livro_titulo_map.get(id_livro, "Livro"),
                "ativos": 0,
                "devolvidos": 0,
            })
            status_item = (it.get("itemStatus") or "").lower()
            data_prev = it.get("dataPrevistaDevolucao")
            if data_prev and not data_prevista_mov:
                data_prevista_mov = data_prev

            if status_item == "devolvido":
                entrada["devolvidos"] += 1
                total_devolvidos += 1
            else:
                entrada["ativos"] += 1
                tem_ativo = True
                if data_prev:
                    try:
                        if datetime.fromisoformat(data_prev).date() < hoje:
                            tem_atrasado = True
                    except Exception:
                        pass

        if mov.get("movStatus") == "Devolvido" or not tem_ativo:
            status = "Devolvido"
        elif tem_atrasado:
            status = "Atrasado"
        else:
            status = "Ativo"

        livros_list = list(por_livro.values())
        total_exemplares = sum(l["ativos"] + l["devolvidos"] for l in livros_list)

        resultado.append({
            "idMovimentacao": mov["idMovimentacao"],
            "finalidade": mov.get("movFinalidade"),
            "serie": mov.get("movSerie"),
            "turma": mov.get("movTurma"),
            "status": status,
            "dataEmprestimo": mov.get("movDataEmprestimo"),
            "dataPrevistaDevolucao": data_prevista_mov,
            "totalLivros": len(livros_list),
            "totalExemplares": total_exemplares,
            "totalDevolvidos": total_devolvidos,
            "livros": livros_list,
        })

    resultado.sort(key=lambda m: m["idMovimentacao"], reverse=True)
    return resultado


@router.get("/professor/turmas")
def listar_turmas_professor(professor=Depends(get_professor)):
    """Séries/turmas disponíveis para seleção, derivadas dos alunos cadastrados."""
    try:
        alunos = (
            supabase.table("Usuario")
            .select("usuSerie, usuTurma")
            .eq("usuTipo", "Aluno")
            .eq("usuStatus", True)
            .execute()
            .data or []
        )
        vistas = set()
        turmas = []
        for a in alunos:
            serie = (a.get("usuSerie") or "").strip()
            turma = (a.get("usuTurma") or "").strip()
            if not serie and not turma:
                continue
            chave = (serie, turma)
            if chave in vistas:
                continue
            vistas.add(chave)
            turmas.append({"serie": serie, "turma": turma})
        turmas.sort(key=lambda t: (t["serie"], t["turma"]))
        return turmas
    except Exception as e:
        print("Erro listar turmas professor:", e)
        return []


@router.get("/professor/emprestimos")
def listar_meus_emprestimos(professor=Depends(get_professor)):
    id_admin = get_admin_id(professor)
    if not id_admin:
        raise HTTPException(status_code=404, detail="Professor não encontrado")
    return _montar_emprestimos_professor(id_admin)


@router.get("/professor/emprestimos/{idMovimentacao}")
def detalhe_meu_emprestimo(idMovimentacao: int, professor=Depends(get_professor)):
    id_admin = get_admin_id(professor)
    if not id_admin:
        raise HTTPException(status_code=404, detail="Professor não encontrado")
    resultado = _montar_emprestimos_professor(id_admin, idMovimentacao)
    if not resultado:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    return resultado[0]


@router.post("/professor/emprestimos")
def criar_emprestimo_professor(data: EmprestimoProfessorCreate, professor=Depends(get_professor)):
    finalidade = (data.finalidade or "").strip().upper()
    if finalidade not in FINALIDADES_VALIDAS:
        raise HTTPException(status_code=400, detail="Finalidade inválida")
    if finalidade == "TURMA" and not (data.turma and data.turma.strip()):
        raise HTTPException(status_code=400, detail="Informe a turma para empréstimos de turma")
    if not data.itens:
        raise HTTPException(status_code=400, detail="Carrinho vazio")

    # Consolida itens repetidos do mesmo livro em uma única quantidade.
    itens_map = {}
    for item in data.itens:
        itens_map[item.idLivro] = itens_map.get(item.idLivro, 0) + item.quantidade

    id_admin = get_admin_id(professor)
    if not id_admin:
        raise HTTPException(status_code=404, detail="Professor não encontrado")

    hoje = datetime.utcnow().date()
    configs = get_config_map()
    dias = get_config_days(configs)
    vencimento = (hoje + timedelta(days=dias)).isoformat()

    claimed_ids = []
    itens_confirmados = []
    try:
        for id_livro, quantidade in itens_map.items():
            livro_resp = supabase.table("Livro").select("idLivro, livTitulo").eq("idLivro", id_livro).limit(1).execute()
            if not livro_resp.data:
                raise HTTPException(status_code=400, detail=f"Livro {id_livro} não encontrado")
            titulo = livro_resp.data[0]["livTitulo"]

            disponiveis_resp = (
                supabase.table("Exemplar")
                .select("idExemplar")
                .eq("idLivro", id_livro)
                .eq("exeLivStatus", "Disponível")
                .order("idExemplar")
                .execute()
            )
            disponiveis_ids = [e["idExemplar"] for e in (disponiveis_resp.data or [])]
            if len(disponiveis_ids) < quantidade:
                raise HTTPException(
                    status_code=409,
                    detail=f'Apenas {len(disponiveis_ids)} exemplar(es) disponível(is) para "{titulo}"',
                )

            # Tenta reservar de forma segura contra concorrência: o update só
            # afeta linhas que ainda estejam "Disponível" no momento exato da
            # escrita. Se outra requisição reservou um desses exemplares entre
            # a consulta acima e este update, menos linhas voltam do que o
            # solicitado — nesse caso a operação inteira é cancelada.
            ids_a_reservar = disponiveis_ids[:quantidade]
            reservado_resp = (
                supabase.table("Exemplar")
                .update({"exeLivStatus": "Emprestado"})
                .in_("idExemplar", ids_a_reservar)
                .eq("exeLivStatus", "Disponível")
                .execute()
            )
            reservados = reservado_resp.data or []
            if len(reservados) < quantidade:
                claimed_ids.extend([r["idExemplar"] for r in reservados])
                raise HTTPException(
                    status_code=409,
                    detail=f'A disponibilidade de "{titulo}" mudou. Tente novamente.',
                )

            claimed_ids.extend(ids_a_reservar)
            itens_confirmados.append({"idLivro": id_livro, "exemplares": ids_a_reservar})

        novo_mov = {
            "idAdmin": id_admin,
            "idUsuario": None,
            "movTipo": "EMPRESTIMO",
            "movStatus": "Ativo",
            "movDataSolicitacao": hoje.isoformat(),
            "movDataEmprestimo": hoje.isoformat(),
            "movFinalidade": finalidade,
            "movTurma": data.turma.strip() if finalidade == "TURMA" and data.turma else None,
            "movSerie": data.serie.strip() if finalidade == "TURMA" and data.serie else None,
        }
        mov_resp = supabase.table("Movimentacao").insert(novo_mov).execute()
        if not mov_resp.data:
            raise HTTPException(status_code=500, detail="Erro ao criar empréstimo")
        id_mov = mov_resp.data[0]["idMovimentacao"]

        linhas_me = [
            {
                "idMovimentacao": id_mov,
                "idExemplar": id_exemplar,
                "dataPrevistaDevolucao": vencimento,
                "itemStatus": "Ativo",
                "renovacoes": 0,
            }
            for item in itens_confirmados
            for id_exemplar in item["exemplares"]
        ]
        me_resp = supabase.table("MovimentacaoExemplar").insert(linhas_me).execute()
        if not me_resp.data:
            supabase.table("Movimentacao").delete().eq("idMovimentacao", id_mov).execute()
            raise HTTPException(status_code=500, detail="Erro ao registrar exemplares do empréstimo")

        return {
            "idMovimentacao": id_mov,
            "finalidade": finalidade,
            "serie": novo_mov["movSerie"],
            "turma": novo_mov["movTurma"],
            "totalLivros": len(itens_confirmados),
            "totalExemplares": len(claimed_ids),
            "dataDevolucao": vencimento,
        }
    except HTTPException:
        _liberar_exemplares(claimed_ids)
        raise
    except Exception as e:
        print("Erro criar emprestimo professor:", e)
        _liberar_exemplares(claimed_ids)
        raise HTTPException(status_code=500, detail="Erro ao criar empréstimo")


@router.post("/professor/emprestimos/{idMovimentacao}/devolucao")
def devolver_emprestimo_professor(idMovimentacao: int, data: DevolucaoProfessor, professor=Depends(get_professor)):
    id_admin = get_admin_id(professor)
    if not id_admin:
        raise HTTPException(status_code=404, detail="Professor não encontrado")

    mov_resp = supabase.table("Movimentacao").select("*").eq("idMovimentacao", idMovimentacao).limit(1).execute()
    if not mov_resp.data:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    mov = mov_resp.data[0]
    if mov.get("idAdmin") != id_admin or not mov.get("movFinalidade"):
        raise HTTPException(status_code=403, detail="Este empréstimo não pertence a você")

    if not data.itens:
        raise HTTPException(status_code=400, detail="Selecione ao menos um exemplar para devolver")

    itens_consolidados = {}
    for item in data.itens:
        itens_consolidados[item.idLivro] = itens_consolidados.get(item.idLivro, 0) + item.quantidade

    itens_ativos = (
        supabase.table("MovimentacaoExemplar")
        .select("idExemplar")
        .eq("idMovimentacao", idMovimentacao)
        .eq("itemStatus", "Ativo")
        .execute()
        .data or []
    )
    exemplar_ids_ativos = [i["idExemplar"] for i in itens_ativos]
    if not exemplar_ids_ativos:
        raise HTTPException(status_code=400, detail="Não há exemplares ativos para devolver")

    exemplares_info = (
        supabase.table("Exemplar")
        .select("idExemplar, idLivro")
        .in_("idExemplar", exemplar_ids_ativos)
        .order("idExemplar")
        .execute()
        .data or []
    )
    por_livro = {}
    for e in exemplares_info:
        por_livro.setdefault(e["idLivro"], []).append(e["idExemplar"])

    ids_para_devolver = []
    for id_livro, quantidade in itens_consolidados.items():
        disponiveis_ativos = por_livro.get(id_livro, [])
        if quantidade > len(disponiveis_ativos):
            raise HTTPException(
                status_code=400,
                detail=f"Apenas {len(disponiveis_ativos)} exemplar(es) ativo(s) deste livro nesta movimentação",
            )
        ids_para_devolver.extend(disponiveis_ativos[:quantidade])

    hoje = datetime.utcnow().date()

    supabase.table("MovimentacaoExemplar").update({
        "dataDevolucao": hoje.isoformat(),
        "itemStatus": "Devolvido",
    }).eq("idMovimentacao", idMovimentacao).in_("idExemplar", ids_para_devolver).execute()

    supabase.table("Exemplar").update({
        "exeLivStatus": "Disponível",
    }).in_("idExemplar", ids_para_devolver).execute()

    restantes = (
        supabase.table("MovimentacaoExemplar")
        .select("idExemplar")
        .eq("idMovimentacao", idMovimentacao)
        .eq("itemStatus", "Ativo")
        .execute()
        .data or []
    )
    if not restantes:
        supabase.table("Movimentacao").update({"movStatus": "Devolvido"}).eq("idMovimentacao", idMovimentacao).execute()

    return {"message": "Devolução registrada com sucesso", "exemplaresDevolvidos": len(ids_para_devolver)}