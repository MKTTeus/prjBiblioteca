from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin, gerar_tombos, executar_em_paralelo
from schemas import Livro, LivroCreate, ExemplarUpdate

router = APIRouter()


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
        lambda: supabase.table("LivroAutor").select("idLivro, Autor(idAutor, autNome, autAnoNascimento, autAnoFalecimento)").in_("idLivro", ids).execute(),
        lambda: supabase.table("LivroCategoria").select("idLivro, Categoria(idCategoria, catNome)").in_("idLivro", ids).execute(),
        lambda: supabase.table("LivroGenero").select("idLivro, Genero(idGenero, genNome)").in_("idLivro", ids).execute(),
    ]
    if ed_ids:
        consultas.append(
            lambda: supabase.table("Editora").select("idEditora, ediNome, ediCidade, ediEstado, ediPais").in_("idEditora", ed_ids).execute()
        )

    resp_autor, resp_categoria, resp_genero, *resto = executar_em_paralelo(*consultas)

    la = resp_autor.data or []
    autor_map = {r["idLivro"]: r["Autor"]["autNome"] for r in la if r.get("Autor")}
    autor_nasc_map = {r["idLivro"]: r["Autor"].get("autAnoNascimento") for r in la if r.get("Autor")}
    autor_falec_map = {r["idLivro"]: r["Autor"].get("autAnoFalecimento") for r in la if r.get("Autor")}

    lc = resp_categoria.data or []
    cat_map    = {r["idLivro"]: r["Categoria"]["catNome"]    for r in lc if r.get("Categoria")}
    cat_id_map = {r["idLivro"]: r["Categoria"]["idCategoria"] for r in lc if r.get("Categoria")}

    lg = resp_genero.data or []
    gen_map    = {r["idLivro"]: r["Genero"]["genNome"]    for r in lg if r.get("Genero")}
    gen_id_map = {r["idLivro"]: r["Genero"]["idGenero"]   for r in lg if r.get("Genero")}

    ed_map = {}
    ed_cidade_map = {}
    ed_estado_map = {}
    ed_pais_map = {}
    
    if resto:
        eds = resto[0].data or []
        ed_map = {e["idEditora"]: e["ediNome"] for e in eds}
        ed_cidade_map = {e["idEditora"]: e.get("ediCidade") or "" for e in eds}
        ed_estado_map = {e["idEditora"]: e.get("ediEstado") or "" for e in eds}
        ed_pais_map = {e["idEditora"]: e.get("ediPais") or "Brasil" for e in eds}

    resultado = []
    for l in livros:
        lid = l["idLivro"]
        resultado.append({
            **l,
            "livAutor":    autor_map.get(lid, ""),
            "autorAnoNascimento": autor_nasc_map.get(lid),
            "autorAnoFalecimento": autor_falec_map.get(lid),
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

@router.get("/autores")
def listar_autores():
    res = supabase.table("Autor").select("idAutor, autNome, autABNT, autAnoNascimento, autAnoFalecimento").order("autNome").execute()
    return res.data or []


@router.get("/editoras")
def listar_editoras():
    res = supabase.table("Editora").select("idEditora, ediNome").order("ediNome").execute()
    return res.data or []


# ── Exemplares extras ─────────────────────────────────────────────

@router.post("/livros/{idLivro}/adicionar-exemplares")
def adicionar_exemplares(
    idLivro: int,
    quantidade: int,
    prefixo: str = "T",
    admin=Depends(get_admin)
):
    livro_resp = supabase.table("Livro").select("livISBN").eq("idLivro", idLivro).execute()
    if not livro_resp.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    tombos = gerar_tombos(quantidade, prefixo)
    exemplares = []
    for t in tombos:
        ex = supabase.table("Exemplar").insert({
            "idLivro": idLivro,
            "exeLivTombo": t,
            "exeLivStatus": "Disponível"
        }).execute()
        exemplares.append(ex.data[0])

    return {"message": f"{quantidade} exemplares adicionados", "exemplares": exemplares}


# ── GET /livros ───────────────────────────────────────────────────

@router.get("/livros")
def listar_livros(
    q: str | None = None,
    categoria: str | None = "todas",
    status: str | None = "todos",
    page: int = 1,
    per_page: int = 100
):
    try:
        allowed_ids = None

        if q:
            q_str = f"%{q}%"

            def buscar_por_titulo():
                return supabase.table("Livro").select("idLivro").ilike("livTitulo", q_str).execute()

            def buscar_por_tombo():
                return supabase.table("Exemplar").select("idLivro").ilike("exeLivTombo", q_str).execute()

            def buscar_por_autor():
                # Passo interno em 2 etapas (autor → LivroAutor), mas essa
                # cadeia inteira roda em paralelo com as outras duas buscas.
                autores = supabase.table("Autor").select("idAutor").ilike("autNome", q_str).execute().data or []
                if not autores:
                    return []
                autor_ids = [a["idAutor"] for a in autores]
                la = supabase.table("LivroAutor").select("idLivro").in_("idAutor", autor_ids).execute().data or []
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
                lc = supabase.table("LivroCategoria").select("idLivro").eq("idCategoria", cat_id).execute().data or []
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
                r = supabase.table("Exemplar").select("idLivro").ilike("exeLivStatus", f"%{cond}%").execute()
                status_ids = {e["idLivro"] for e in (r.data or [])}
                allowed_ids = status_ids if allowed_ids is None else allowed_ids & status_ids

        if isinstance(allowed_ids, set) and len(allowed_ids) == 0:
            return []

        query = supabase.table("Livro").select("*")
        if isinstance(allowed_ids, set):
            query = query.in_("idLivro", list(allowed_ids))

        start = (page - 1) * per_page
        livros = query.range(start, start + per_page - 1).execute().data or []

        livro_ids = [l["idLivro"] for l in livros]
        exemplares = []
        if livro_ids:
            exemplares = supabase.table("Exemplar").select("*").in_("idLivro", livro_ids).execute().data or []

        mapa_ex = {}
        for ex in exemplares:
            s = (ex.get("exeLivStatus") or "").lower()
            if "desativado" in s:
                continue
            lid = ex["idLivro"]
            if lid not in mapa_ex:
                mapa_ex[lid] = {"total": 0, "disponiveis": 0, "emprestados": 0, "reservados": 0}
            mapa_ex[lid]["total"] += 1
            if "dispon" in s:   mapa_ex[lid]["disponiveis"] += 1
            elif "emprest" in s: mapa_ex[lid]["emprestados"] += 1
            elif "reserv" in s:  mapa_ex[lid]["reservados"] += 1

        livros_ativos = [
            {**l, **mapa_ex.get(l["idLivro"], {"total": 0, "disponiveis": 0, "emprestados": 0, "reservados": 0})}
            for l in livros
            if mapa_ex.get(l["idLivro"], {}).get("total", 0) > 0
        ]

        # Enriquecer com autor, editora, categoria, gênero
        return enriquecer_livros(livros_ativos)

    except Exception as e:
        print("ERRO listar_livros:", e)
        raise HTTPException(status_code=500, detail="Erro ao listar livros")


@router.get("/livros/{idLivro}")
def detalhes_livro(idLivro: int):
    livro_resp = supabase.table("Livro").select("*").eq("idLivro", idLivro).execute()
    if not livro_resp.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    exemplares_resp = supabase.table("Exemplar").select("*").eq("idLivro", idLivro).execute()
    livro_enriquecido = enriquecer_livros(livro_resp.data)[0]

    return {"livro": livro_enriquecido, "exemplares": exemplares_resp.data}


# ── POST /livros ──────────────────────────────────────────────────

@router.post("/livros")
def criar_livro(data: LivroCreate, admin=Depends(get_admin)):
    try:
        payload = data.livro.model_dump()

        # exemplarISBN é o nome usado no formulário (o ISBN é digitado/lido
        # junto do exemplar físico), mas na modelagem do banco o ISBN é um
        # atributo do Livro (coluna livISBN, única) — cada exemplar (tombo)
        # é só uma cópia física da mesma edição/ISBN.
        isbn = (payload.pop("exemplarISBN", None) or "").strip() or None
        if isbn:
            payload["livISBN"] = isbn
        else:
            payload.pop("livISBN", None)
        id_categoria = payload.pop("idCategoria", None)
        id_genero    = payload.pop("idGenero", None)
        nome_autor   = (payload.pop("livAutor",   None) or "").strip() or None
        autor_ano_nasc  = payload.pop("autorAnoNascimento", None)
        autor_ano_falec = payload.pop("autorAnoFalecimento", None)
        nome_editora = (payload.pop("livEditora", None) or "").strip() or None
        edi_cidade = (payload.pop("ediCidade", None) or "").strip() or None
        edi_estado = (payload.pop("ediEstado", None) or "").strip() or None
        edi_pais   = (payload.pop("ediPais", None) or "").strip() or "Brasil"


        # Resolver FK de editora
        id_editora = resolver_editora(nome_editora, edi_cidade, edi_estado, edi_pais)
        if id_editora:
            payload["idEditora"] = id_editora

        livro_resp = supabase.table("Livro").insert(payload).execute()
        if not livro_resp.data:
            raise HTTPException(status_code=500, detail="Não foi possível criar o livro")
        id_livro = livro_resp.data[0]["idLivro"]

        # Autor → LivroAutor
        id_autor = resolver_autor(nome_autor, autor_ano_nasc, autor_ano_falec)
        if id_autor:
            supabase.table("LivroAutor").insert({"idLivro": id_livro, "idAutor": id_autor}).execute()

        # Categoria → LivroCategoria
        if id_categoria:
            supabase.table("LivroCategoria").insert({"idLivro": id_livro, "idCategoria": id_categoria}).execute()

        # Gênero → LivroGenero
        if id_genero:
            supabase.table("LivroGenero").insert({"idLivro": id_livro, "idGenero": id_genero}).execute()

        # Exemplares
        tombos = gerar_tombos(data.quantidade_exemplares, data.prefixo_tombo)
        exemplares = []
        for t in tombos:
            ex = supabase.table("Exemplar").insert({
                "idLivro": id_livro, "exeLivTombo": t, "exeLivStatus": "Disponível"
            }).execute()
            exemplares.append(ex.data[0])

        return {"livro": livro_resp.data[0], "exemplares": exemplares}
    except HTTPException:
        raise
    except Exception as e:
        print("Erro ao criar livro:", e)
        error_msg = str(e)
        if "null value in column" in error_msg or "23502" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="Preencha todos os campos obrigatórios do livro (título e número de páginas).",
            )
        if "livISBN" in error_msg and ("duplicate key" in error_msg or "23505" in error_msg):
            raise HTTPException(
                status_code=409,
                detail="Já existe um livro cadastrado com esse ISBN.",
            )
        raise HTTPException(status_code=500, detail=f"Erro ao criar livro: {str(e)}")


# ── PUT /livros/{idLivro} ─────────────────────────────────────────

@router.put("/livros/{idLivro}")
def atualizar_livro(idLivro: int, livro: Livro, admin=Depends(get_admin)):
    try:
        payload = livro.model_dump()
        # Mesmo mapeamento de criar_livro: o ISBN do formulário (exemplarISBN)
        # é gravado na coluna livISBN do Livro. Aqui, diferente da criação,
        # setamos explicitamente (mesmo quando vazio) para permitir limpar
        # um ISBN cadastrado incorretamente.
        isbn = (payload.pop("exemplarISBN", None) or "").strip() or None
        payload["livISBN"] = isbn
        id_categoria = payload.pop("idCategoria", None)
        id_genero    = payload.pop("idGenero", None)
        nome_autor   = (payload.pop("livAutor",   None) or "").strip() or None
        autor_ano_nasc  = payload.pop("autorAnoNascimento", None)
        autor_ano_falec = payload.pop("autorAnoFalecimento", None)
        nome_editora = (payload.pop("livEditora", None) or "").strip() or None
        edi_cidade = (payload.pop("ediCidade", None) or "").strip() or None
        edi_estado = (payload.pop("ediEstado", None) or "").strip() or None
        edi_pais   = (payload.pop("ediPais", None) or "").strip() or "Brasil"


        # Resolver FK de editora
        id_editora = resolver_editora(nome_editora, edi_cidade, edi_estado, edi_pais)
        if id_editora:
            payload["idEditora"] = id_editora
        else:
            payload.pop("idEditora", None)  # não apagar editora existente se não veio

        resp = supabase.table("Livro").update(payload).eq("idLivro", idLivro).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Livro não encontrado")

        # Autor
        if nome_autor is not None:
            id_autor = resolver_autor(nome_autor, autor_ano_nasc, autor_ano_falec)
            if id_autor:
                supabase.table("LivroAutor").delete().eq("idLivro", idLivro).execute()
                supabase.table("LivroAutor").insert({"idLivro": idLivro, "idAutor": id_autor}).execute()

        # Categoria
        if id_categoria is not None:
            supabase.table("LivroCategoria").delete().eq("idLivro", idLivro).execute()
            supabase.table("LivroCategoria").insert({"idLivro": idLivro, "idCategoria": id_categoria}).execute()

        # Gênero
        if id_genero is not None:
            supabase.table("LivroGenero").delete().eq("idLivro", idLivro).execute()
            supabase.table("LivroGenero").insert({"idLivro": idLivro, "idGenero": id_genero}).execute()

        return enriquecer_livros(resp.data)[0]
    except HTTPException:
        raise
    except Exception as e:
        print("Erro ao atualizar livro:", e)
        error_msg = str(e)
        if "null value in column" in error_msg or "23502" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="Preencha todos os campos obrigatórios do livro (título e número de páginas).",
            )
        if "livISBN" in error_msg and ("duplicate key" in error_msg or "23505" in error_msg):
            raise HTTPException(
                status_code=409,
                detail="Já existe um livro cadastrado com esse ISBN.",
            )
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar livro: {str(e)}")


@router.delete("/livros/{idLivro}")
def deletar_livro(idLivro: int, admin=Depends(get_admin)):
    supabase.table("Exemplar").update({"exeLivStatus": "Inativo"}).eq("idLivro", idLivro).execute()
    return {"message": "Livro desativado com sucesso"}


@router.put("/exemplares/{idExemplar}")
def atualizar_exemplar(idExemplar: int, data: ExemplarUpdate, admin=Depends(get_admin)):
    resp = supabase.table("Exemplar").select("*").eq("idExemplar", idExemplar).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Exemplar não encontrado")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    updated = supabase.table("Exemplar").update(update_data).eq("idExemplar", idExemplar).execute()
    return updated.data[0]


@router.get("/exemplares")
def listar_exemplares():
    resp = supabase.table("Exemplar").select("*").execute()
    return resp.data or []


@router.get("/exemplares/disponiveis")
def exemplares_disponiveis():
    try:
        exemplares = supabase.table("Exemplar").select("idExemplar, exeLivTombo, idLivro") \
            .eq("exeLivStatus", "Disponível").execute().data or []

        livro_ids = list({ex["idLivro"] for ex in exemplares})
        mapa_livros = {}
        if livro_ids:
            livros = supabase.table("Livro").select("idLivro, livTitulo").in_("idLivro", livro_ids).execute().data or []
            mapa_livros = {l["idLivro"]: l["livTitulo"] for l in livros}

        return [
            {
                "id":      ex["idExemplar"],
                "tombo":   ex["exeLivTombo"],
                "nome":    mapa_livros.get(ex["idLivro"], "Livro"),
                "idLivro": ex["idLivro"],
            }
            for ex in exemplares
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))