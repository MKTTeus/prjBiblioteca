from core import consultar_completo, consultar_lote
from datetime import timedelta

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Header
from rpc import executar_rpc

from database import supabase
from core import business_today, datetime_utc, get_professor, get_admin_id, utc_now
from schemas import EmprestimoProfessorCreate, DevolucaoExemplares
from routers.emprestimos import get_config_map, get_config_days

router = APIRouter()

FINALIDADES_VALIDAS = {"PESSOAL", "TURMA"}




def _montar_emprestimos_professor(id_admin_professor: int, id_movimentacao: int = None):
    """Monta a lista (ou um item) de empréstimos do professor, já agregando
    os exemplares de cada movimentação por livro (ativos/devolvidos)."""
    query = (
        supabase.table("Movimentacao")
        .select("*")
        .not_.is_("movFinalidade", "null")
    )
    if id_movimentacao is not None:
        query = query.eq("idMovimentacao", id_movimentacao)
    movimentacoes = consultar_completo(lambda:query.eq('idAdminProfessor',id_admin_professor),'Movimentacao').data
    if not movimentacoes:
        return []

    hoje = business_today()
    mov_ids = [m["idMovimentacao"] for m in movimentacoes]

    itens = consultar_lote(lambda ids_lote: supabase.table('MovimentacaoExemplar').select('*').in_('idMovimentacao', ids_lote), 'MovimentacaoExemplar', mov_ids).data or []
    exemplar_ids = list({i["idExemplar"] for i in itens if i.get("idExemplar")})

    exemplar_info = {}
    exemplar_livro_map = {}
    livro_titulo_map = {}
    if exemplar_ids:
        exemplares = consultar_lote(lambda ids_lote: supabase.table('Exemplar').select('idExemplar, idLivro, exeLivTombo').in_('idExemplar', ids_lote), 'Exemplar', exemplar_ids).data or []
        exemplar_info = {e["idExemplar"]: e for e in exemplares}
        exemplar_livro_map = {e["idExemplar"]: e["idLivro"] for e in exemplares}
        livro_ids = list({lid for lid in exemplar_livro_map.values() if lid})
        if livro_ids:
            livros = consultar_lote(lambda ids_lote: supabase.table('Livro').select('idLivro, livTitulo').in_('idLivro', ids_lote), 'Livro', livro_ids).data or []
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
        tem_pendente = False
        tem_aprovado = False
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
            if status_item in ("pendente", "aprovado"):
                tem_pendente = tem_pendente or status_item == "pendente"
                tem_aprovado = tem_aprovado or status_item == "aprovado"
            if data_prev and not data_prevista_mov:
                data_prevista_mov = data_prev

            if status_item == "devolvido":
                entrada["devolvidos"] += 1
                total_devolvidos += 1
            elif status_item in ("pendente", "aprovado"):
                entrada.setdefault("pendentes", 0)
                entrada["pendentes"] += 1
            elif status_item == "ativo":
                entrada["ativos"] += 1
                tem_ativo = True
                if data_prev:
                    try:
                        if datetime_utc(data_prev).date() < hoje:
                            tem_atrasado = True
                    except Exception:
                        pass

        mov_status = (mov.get("movStatus") or "").lower()
        if mov_status == "pendente" or tem_pendente:
            status = "Pendente"
        elif mov_status == "aprovado" or tem_aprovado:
            status = "Aguardando retirada"
        elif mov_status in ("negado", "rejeitado"):
            status = "Negado"
        elif mov_status == "expirado":
            status = "Expirada"
        elif mov.get("movStatus") == "Devolvido" or not tem_ativo:
            status = "Devolvido"
        elif tem_atrasado:
            status = "Atrasado"
        else:
            status = "Ativo"

        livros_list = list(por_livro.values())
        total_exemplares = sum(
            l["ativos"] + l["devolvidos"] + l.get("pendentes", 0)
            for l in livros_list
        )

        resultado.append({
            "idMovimentacao": mov["idMovimentacao"],
            "finalidade": mov.get("movFinalidade"),
            "serie": mov.get("movSerie"),
            "turma": mov.get("movTurma"),
            "status": status,
            "dataEmprestimo": mov.get("movDataEmprestimo"),
            "dataPrevistaDevolucao": data_prevista_mov,
            "totalLivros": len(livros_list),
            "totalExemplares": len(mov_itens),
            "totalDevolvidos": total_devolvidos,
            "statusConfirmacao": mov.get("status_confirmacao") or "PENDENTE",
            "dataConfirmacao": mov.get("data_confirmacao"),
            "livros": livros_list,
            "exemplares": [{**it, "idLivro": exemplar_livro_map.get(it["idExemplar"]), "tombo": exemplar_info.get(it["idExemplar"], {}).get("exeLivTombo"), "titulo": livro_titulo_map.get(exemplar_livro_map.get(it["idExemplar"]), "Livro")} for it in mov_itens],
        })

    resultado.sort(key=lambda m: m["idMovimentacao"], reverse=True)
    return resultado


@router.get("/professor/turmas")
def listar_turmas_professor(professor=Depends(get_professor)):
    """Séries/turmas disponíveis para seleção, derivadas dos alunos cadastrados."""
    try:
        alunos = (
            consultar_completo(lambda: supabase.table('Usuario').select('usuSerie, usuTurma').eq('usuTipo', 'Aluno').eq('usuStatus', True), 'Usuario')
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
        raise HTTPException(503,'Serviço temporariamente indisponível') from e


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
def criar_emprestimo_professor(data: EmprestimoProfessorCreate, professor=Depends(get_professor), idempotency_key: UUID | None = Header(default=None, alias="Idempotency-Key")):
    return executar_rpc("criar_movimentacao", {"p_usuario": None, "p_professor": professor["id"],
        "p_admin": None, "p_itens": [item.model_dump() for item in data.itens],
        "p_finalidade": data.finalidade, "p_turma": data.turma, "p_serie": data.serie,
        "p_chave": str(idempotency_key) if idempotency_key else None})


@router.post("/professor/emprestimos/{idMovimentacao}/devolucao")
def devolver_emprestimo_professor(idMovimentacao: int, data: DevolucaoExemplares, professor=Depends(get_professor)):
    return executar_rpc("transicionar_movimentacao", {"p_id": idMovimentacao, "p_acao": "devolver",
        "p_professor": professor["id"], "p_ids": data.idExemplares})
