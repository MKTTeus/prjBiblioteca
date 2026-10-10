from core import consultar_completo, consultar_lote
from fastapi import APIRouter, Depends, HTTPException, Query

from database import supabase
from core import get_admin, executar_em_paralelo, buscar_todos
from rpc import executar_rpc
from schemas import Livro, LivroCreate, ExemplarUpdate, LivroStatusUpdate

router = APIRouter()

TAMANHO_LOTE_SUPABASE = 100


def consultar_em_lotes(criar_consulta, ids: list[int], ordem: str = "idLivro") -> list[dict]:
    """Consulta o Supabase em lotes de IDs, paginando também o RESULTADO de
    cada lote via .range().

    Importante: dividir os `ids` em lotes de TAMANHO_LOTE_SUPABASE evita
    listas de IN(...) grandes demais, mas não garante que cada consulta
    retorne no máximo TAMANHO_LOTE_SUPABASE linhas (ex.: 100 livros podem ter
    300 Exemplares). O projeto Supabase tem um limite de linhas por
    requisição (Max Rows) que corta silenciosamente qualquer resultado maior
    que isso — por isso cada lote de IDs também precisa ser paginado com
    .range() até esgotar as linhas, e não apenas executado uma vez.
    """
    registros = []
    for inicio in range(0, len(ids), TAMANHO_LOTE_SUPABASE):
        lote = ids[inicio:inicio + TAMANHO_LOTE_SUPABASE]
        offset = 0
        while True:
            query=criar_consulta(lote)
            for coluna in ordem.split(','): query=query.order(coluna)
            resposta = query.range(offset, offset + TAMANHO_LOTE_SUPABASE - 1).execute()
            pagina = resposta.data or []
            registros.extend(pagina)
            if len(pagina) < TAMANHO_LOTE_SUPABASE:
                break
            offset += TAMANHO_LOTE_SUPABASE
    return registros


# ── Helpers de JOIN ───────────────────────────────────────────────

def enriquecer_livros(livros: list) -> list:
    """
    Recebe uma lista de dicts de Livro e injeta:
    livAutor, livEditora, livCategoria (nome), livGenero (nome),
    idCategoria, idGenero, ediCidade, ediEstado, ediPais
    a partir das tabelas de relacionamento.
    """
    if not livros:
        return []

    ids = [l["idLivro"] for l in livros]
    ed_ids = list({l["idEditora"] for l in livros if l.get("idEditora")})

    # As 4 consultas abaixo são independentes entre si (cada uma só depende
    # da lista de ids de livros), então rodam em paralelo em vez de uma
    # atrás da outra — é o principal ponto de lentidão ao carregar livros,
    # já que esta função é chamada em toda listagem/detalhe/salvamento.
    consultas = [
        lambda lote: consultar_em_lotes(
            lambda ids_lote: supabase.table("LivroAutor").select("idLivro, Autor(idAutor, autNome, autAnoNascimento, autAnoFalecimento)").in_("idLivro", ids_lote),
            lote, "idLivro,idAutor",
        ),
        lambda lote: consultar_em_lotes(
            lambda ids_lote: supabase.table("LivroCategoria").select("idLivro, Categoria(idCategoria, catNome)").in_("idLivro", ids_lote),
            lote, "idLivro,idCategoria",
        ),
        lambda lote: consultar_em_lotes(
            lambda ids_lote: supabase.table("LivroGenero").select("idLivro, Genero(idGenero, genNome)").in_("idLivro", ids_lote),
            lote, "idLivro,idGenero",
        ),
    ]
    if ed_ids:
        consultas.append(
            lambda lote: consultar_em_lotes(
                lambda ids_lote: supabase.table("Editora").select("idEditora, ediNome, ediCidade, ediEstado, ediPais").in_("idEditora", ids_lote),
                lote, "idEditora",
            )
        )

    respostas = executar_em_paralelo(
        *(lambda consulta=consulta: consulta(ed_ids if i==3 else ids) for i,consulta in enumerate(consultas))
    )
    la, lc, lg, *resto = respostas

    autores_por_livro: dict[int, list[dict]] = {}
    for r in la:
        autor = r.get("Autor")
        if not autor:
            continue
        autores_por_livro.setdefault(r["idLivro"], []).append(autor)

    cat_map    = {r["idLivro"]: r["Categoria"]["catNome"]    for r in lc if r.get("Categoria")}
    cat_id_map = {r["idLivro"]: r["Categoria"]["idCategoria"] for r in lc if r.get("Categoria")}

    gen_map    = {r["idLivro"]: r["Genero"]["genNome"]    for r in lg if r.get("Genero")}
    gen_id_map = {r["idLivro"]: r["Genero"]["idGenero"]   for r in lg if r.get("Genero")}

    ed_map = {}
    ed_cidade_map = {}
    ed_estado_map = {}
    ed_pais_map = {}
    
    if resto:
        eds = resto[0]
        ed_map = {e["idEditora"]: e["ediNome"] for e in eds}
        ed_cidade_map = {e["idEditora"]: e.get("ediCidade") or "" for e in eds}
        ed_estado_map = {e["idEditora"]: e.get("ediEstado") or "" for e in eds}
        ed_pais_map = {e["idEditora"]: e.get("ediPais") or "Brasil" for e in eds}

    resultado = []
    for l in livros:
        lid = l["idLivro"]
        autores_livro = autores_por_livro.get(lid, [])
        resultado.append({
            **l,
            # livAutor continua sendo uma string (compatibilidade com o front
            # e com a ficha catalográfica) — quando há mais de um autor, os
            # nomes vêm separados por vírgula. A lista completa (com id e
            # anos de cada autor) vai em "autores", para quem precisar dela.
            "livAutor":    ", ".join(a["autNome"] for a in autores_livro),
            "autores":     autores_livro,
            "autorAnoNascimento": autores_livro[0].get("autAnoNascimento") if autores_livro else None,
            "autorAnoFalecimento": autores_livro[0].get("autAnoFalecimento") if autores_livro else None,
            "livEditora":  ed_map.get(l.get("idEditora"), ""),
            "livCategoria": cat_map.get(lid, ""),
            "livGenero":    gen_map.get(lid, ""),
            "idCategoria":  cat_id_map.get(lid),
            "idGenero":     gen_id_map.get(lid),
            "ediCidade":   ed_cidade_map.get(l.get("idEditora"), ""),
            "ediEstado":   ed_estado_map.get(l.get("idEditora"), ""),
            "ediPais":     ed_pais_map.get(l.get("idEditora"), "Brasil"),
        })

    return resultado


def resolver_autor(nome_autor: str, ano_nascimento: int | None = None, ano_falecimento: int | None = None) -> int | None:
    """Busca ou cria um Autor pelo nome, retorna idAutor.

    Quando o ano de nascimento/falecimento é informado, também atualiza o
    registro existente (permite completar esse dado depois, ex.: acrescentar
    o ano de falecimento de um autor que já estava cadastrado).
    """
    if not nome_autor:
        return None
    au = supabase.table("Autor").select("idAutor").eq("autNome", nome_autor).limit(1).execute()
    if au.data:
        id_autor = au.data[0]["idAutor"]
        upd = {}
        if ano_nascimento is not None:
            upd["autAnoNascimento"] = ano_nascimento
        if ano_falecimento is not None:
            upd["autAnoFalecimento"] = ano_falecimento
        if upd:
            supabase.table("Autor").update(upd).eq("idAutor", id_autor).execute()
        return id_autor
    payload = {"autNome": nome_autor}
    if ano_nascimento is not None:
        payload["autAnoNascimento"] = ano_nascimento
    if ano_falecimento is not None:
        payload["autAnoFalecimento"] = ano_falecimento
    novo = supabase.table("Autor").insert(payload).execute()
    return novo.data[0]["idAutor"]


def resolver_autores_multiplos(nomes_autor: str | None, ano_nascimento: int | None = None, ano_falecimento: int | None = None) -> list[int]:
    """Aceita o mesmo campo de texto do formulário (livAutor), mas agora
    permite vários nomes separados por vírgula — ex.: "J.R.R. Tolkien,
    Christopher Tolkien" — já que um livro pode ter vários autores (relação
    M:N via LivroAutor). Busca ou cria cada um e retorna a lista de idAutor,
    na mesma ordem em que foram digitados, sem duplicatas.

    Ano de nascimento/falecimento só é aplicado ao primeiro nome da lista,
    porque o formulário só expõe esses dois campos para um único autor.
    """
    if not nomes_autor:
        return []

    nomes = [n.strip() for n in nomes_autor.split(",")]
    nomes = [n for n in nomes if n]

    ids: list[int] = []
    vistos: set[str] = set()
    for indice, nome in enumerate(nomes):
        chave = nome.lower()
        if chave in vistos:
            continue
        vistos.add(chave)
        if indice == 0:
            id_autor = resolver_autor(nome, ano_nascimento, ano_falecimento)
        else:
            id_autor = resolver_autor(nome)
        if id_autor:
            ids.append(id_autor)
    return ids


def resolver_editora(nome_editora: str, cidade: str = None, estado: str = None, pais: str = None) -> int | None:
    """Busca ou cria uma Editora pelo nome, e atualiza/informa sua localização."""
    if not nome_editora:
        return None
    ed = supabase.table("Editora").select("idEditora").eq("ediNome", nome_editora).limit(1).execute()

    if ed.data:
        id_editora = ed.data[0]["idEditora"]
        # Editora já existe: atualiza cidade/estado/país se algum foi informado
        upd = {}
        if cidade is not None: upd["ediCidade"] = cidade
        if estado is not None: upd["ediEstado"] = estado
        if pais is not None:   upd["ediPais"] = pais
        if upd:
            supabase.table("Editora").update(upd).eq("idEditora", id_editora).execute()
        return id_editora

    # Editora nova: insere já com a localização informada
    novo_payload = {"ediNome": nome_editora}
    if cidade is not None: novo_payload["ediCidade"] = cidade
    if estado is not None: novo_payload["ediEstado"] = estado
    if pais is not None:   novo_payload["ediPais"] = pais
    novo = supabase.table("Editora").insert(novo_payload).execute()
    return novo.data[0]["idEditora"]


# ── Endpoints auxiliares ──────────────────────────────────────────

@router.get("/editoras")
def listar_editoras():
    res = consultar_completo(lambda: supabase.table('Editora').select('idEditora, ediNome').order('ediNome'), 'Editora')
    return res.data or []


# ── Exemplares extras ─────────────────────────────────────────────

@router.post("/livros/{idLivro}/adicionar-exemplares")
def adicionar_exemplares(idLivro: int, quantidade: int = Query(ge=1,le=500), prefixo: str = Query('T',pattern=r'^[A-Za-z][A-Za-z0-9_-]{0,19}$'),admin=Depends(get_admin)):
    exemplares=executar_rpc('adicionar_exemplares',{'p_livro':idLivro,'p_quantidade':quantidade,'p_prefixo':prefixo})
    return {'message':f'{len(exemplares)} exemplares adicionados','exemplares':exemplares}


# ── GET /livros ───────────────────────────────────────────────────

@router.get("/livros")
def listar_livros(
    q: str | None = None,
    categoria: str | None = "todas",
    status: str | None = "todos",
    page: int = Query(1, ge=1),
    per_page: int = Query(10000, ge=1, le=10000),
    incluir_inativos: bool = False
):
    return _listar_livros(q, categoria, status, page, per_page, incluir_inativos)


@router.get("/livros/gestao")
def listar_livros_gestao(
    q: str | None = None,
    categoria: str | None = "todas",
    status: str | None = "todos",
    page: int = Query(1, ge=1),
    per_page: int = Query(10000, ge=1, le=10000),
    admin=Depends(get_admin)
):
    return _listar_livros(q, categoria, status, page, per_page, True, True)


def _listar_livros(
    q: str | None = None,
    categoria: str | None = "todas",
    status: str | None = "todos",
    page: int = 1,
    per_page: int = 10000,
    incluir_inativos: bool = False,
    incluir_sem_exemplares: bool = False
):
    try:
        allowed_ids = None

        if q:
            q_str = f"%{q}%"

            def buscar_por_titulo():
                return consultar_completo(lambda: supabase.table('Livro').select('idLivro').ilike('livTitulo', q_str), 'Livro')

            def buscar_por_tombo():
                return consultar_completo(lambda: supabase.table('Exemplar').select('idLivro').ilike('exeLivTombo', q_str), 'Exemplar')

            def buscar_por_autor():
                # Passo interno em 2 etapas (autor → LivroAutor), mas essa
                # cadeia inteira roda em paralelo com as outras duas buscas.
                autores = consultar_completo(lambda: supabase.table('Autor').select('idAutor').ilike('autNome', q_str), 'Autor').data or []
                if not autores:
                    return []
                autor_ids = [a["idAutor"] for a in autores]
                la = consultar_lote(lambda ids_lote: supabase.table('LivroAutor').select('idLivro').in_('idAutor', ids_lote), 'LivroAutor', autor_ids).data or []
                return [r["idLivro"] for r in la]

            resp_titulo, resp_tombo, ids_por_autor = executar_em_paralelo(
                buscar_por_titulo, buscar_por_tombo, buscar_por_autor
            )

            ids = set()
            ids.update(l["idLivro"] for l in (resp_titulo.data or []))
            ids.update(e["idLivro"] for e in (resp_tombo.data or []))
            ids.update(ids_por_autor)

            allowed_ids = ids

        if categoria and categoria != "todas":
            try:
                cat_id = int(categoria)
                # Filtrar por categoria via LivroCategoria
                lc = consultar_completo(lambda: supabase.table('LivroCategoria').select('idLivro').eq('idCategoria', cat_id), 'LivroCategoria').data or []
                cat_ids = {r["idLivro"] for r in lc}
                allowed_ids = cat_ids if allowed_ids is None else allowed_ids & cat_ids
            except Exception:
                pass

        if status and status.lower() != "todos":
            mapa = {
                "disponivel": "Disponível",
                "emprestado": "Emprestado",
                "reservado":  "Reservado",
                "desativado": "desativado",
            }
            cond = mapa.get(status.lower())
            if cond:
                r = consultar_completo(lambda: supabase.table('Exemplar').select('idLivro').ilike('exeLivStatus', f'%{cond}%'), 'Exemplar')
                status_ids = {e["idLivro"] for e in (r.data or [])}
                allowed_ids = status_ids if allowed_ids is None else allowed_ids & status_ids

        if isinstance(allowed_ids, set) and len(allowed_ids) == 0:
            return []

        def criar_consulta_livros():
            q = supabase.table("Livro").select("*")
            if not incluir_inativos:
                q = q.eq("livAtivo", True)
            if isinstance(allowed_ids, set):
                q = q.in_("idLivro", list(allowed_ids))
            return q.order("idLivro")

        start = (page - 1) * per_page
        if isinstance(allowed_ids,set):
            def consulta_lote(ids_lote):
                qb=supabase.table('Livro').select('*').in_('idLivro',ids_lote)
                return qb if incluir_inativos else qb.eq('livAtivo',True)
            livros=sorted(consultar_lote(consulta_lote,'Livro',sorted(allowed_ids)).data,key=lambda l:l['idLivro'])[start:start+per_page]
        else:
            livros=[]
            while len(livros)<per_page:
                inicio_lote=start+len(livros); tamanho_lote=min(TAMANHO_LOTE_SUPABASE,per_page-len(livros))
                lote=criar_consulta_livros().range(inicio_lote,inicio_lote+tamanho_lote-1).execute().data or []
                livros.extend(lote)
                if len(lote)<tamanho_lote: break

        livro_ids = [l["idLivro"] for l in livros]
        exemplares = []
        if livro_ids:
            exemplares = consultar_em_lotes(
                lambda ids_lote: supabase.table("Exemplar").select("*").in_("idLivro", ids_lote),
                livro_ids, "idExemplar",
            )

        mapa_ex = {}
        cadastrados = {}
        desativados = {}
        for ex in exemplares:
            lid = ex["idLivro"]
            cadastrados[lid] = cadastrados.get(lid, 0) + 1
            s = (ex.get("exeLivStatus") or "").lower()
            if "desativado" in s:
                desativados[lid] = desativados.get(lid, 0) + 1
                continue
            if lid not in mapa_ex:
                mapa_ex[lid] = {"total_exemplares": 0, "disponiveis": 0, "emprestados": 0, "reservados": 0}
            mapa_ex[lid]["total_exemplares"] += 1
            if "dispon" in s:   mapa_ex[lid]["disponiveis"] += 1
            elif "emprest" in s: mapa_ex[lid]["emprestados"] += 1
            elif "reserv" in s:  mapa_ex[lid]["reservados"] += 1

        livros_ativos = [
            {**l, **mapa_ex.get(l["idLivro"], {"total_exemplares": 0, "disponiveis": 0, "emprestados": 0, "reservados": 0}),
             "exemplares_cadastrados": cadastrados.get(l["idLivro"], 0),
             "exemplares_desativados": desativados.get(l["idLivro"], 0)}
            for l in livros
            if incluir_sem_exemplares or mapa_ex.get(l["idLivro"], {}).get("total_exemplares", 0) > 0
        ]

        # Enriquecer com autor, editora, categoria, gênero
        return enriquecer_livros(livros_ativos)

    except Exception as e:
        print("ERRO listar_livros:", 'falha de operação')
        raise HTTPException(status_code=500, detail="Erro ao listar livros")


@router.get("/livros/{idLivro}")
def detalhes_livro(idLivro: int):
    livro_resp = consultar_completo(lambda: supabase.table('Livro').select('*').eq('idLivro', idLivro), 'Livro')
    if not livro_resp.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    exemplares_resp = consultar_completo(lambda: supabase.table('Exemplar').select('*').eq('idLivro', idLivro), 'Exemplar')
    livro_enriquecido = enriquecer_livros(livro_resp.data)[0]

    return {"livro": livro_enriquecido, "exemplares": exemplares_resp.data}


# ── POST /livros ──────────────────────────────────────────────────

@router.post("/livros")
def criar_livro(data: LivroCreate, admin=Depends(get_admin)):
    return executar_rpc('salvar_livro',{'p_id':None,'p_dados':data.livro.model_dump(exclude_unset=True),'p_quantidade':data.quantidade_exemplares,'p_prefixo':data.prefixo_tombo})


# ── PUT /livros/{idLivro} ─────────────────────────────────────────

@router.put("/livros/{idLivro}")
def atualizar_livro(idLivro: int, livro: Livro, admin=Depends(get_admin)):
    result=executar_rpc('salvar_livro',{'p_id':idLivro,'p_dados':livro.model_dump(exclude_unset=True)})
    return enriquecer_livros([result['livro']])[0]


@router.patch("/livros/{idLivro}/status")
def alterar_status_livro(idLivro: int, data: LivroStatusUpdate, admin=Depends(get_admin)):
    """
    Ativa/desativa um livro (soft toggle, totalmente reversível).

    Um livro desativado (livAtivo = false) some do catálogo dos usuários
    (GET /livros sem incluir_inativos), mas continua no banco com todos os
    seus dados intactos — Exemplares, histórico de empréstimos, vínculos de
    autor/categoria/gênero — e pode ser reativado a qualquer momento.
    """
    livro = consultar_completo(lambda: supabase.table('Livro').select('idLivro').eq('idLivro', idLivro), 'Livro')
    if not livro.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    supabase.table("Livro").update({"livAtivo": data.ativo}).eq("idLivro", idLivro).execute()

    mensagem = "Livro reativado com sucesso" if data.ativo else "Livro desativado e removido do catálogo"
    return {"message": mensagem, "ativo": data.ativo}


@router.delete("/livros/{idLivro}")
def deletar_livro(idLivro:int,admin=Depends(get_admin)):
    executar_rpc('excluir_livro',{'p_id':idLivro})
    return {'message':'Livro excluído permanentemente com sucesso'}


@router.put("/exemplares/{idExemplar}")
def atualizar_exemplar(idExemplar:int,data:ExemplarUpdate,admin=Depends(get_admin)):
    return executar_rpc('salvar_exemplar',{'p_id':idExemplar,'p_dados':data.model_dump(exclude_unset=True)})

