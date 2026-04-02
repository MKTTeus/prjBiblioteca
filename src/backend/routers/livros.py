from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin, gerar_tombos
from schemas import Livro, LivroCreate, ExemplarUpdate

router = APIRouter()


@router.post("/livros/{idLivro}/adicionar-exemplares")
def adicionar_exemplares(
    idLivro: int,
    quantidade: int,
    prefixo: str = "T",
    admin=Depends(get_admin)
):
    livro_resp = supabase.table("ExemplarLivro").select("idLivro, exeLivISBN").eq("idLivro", idLivro).execute()

    if not livro_resp.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    livro = livro_resp.data[0]
    isbn_padrao = livro.get("exeLivISBN")

    tombos = gerar_tombos(quantidade, prefixo)

    exemplares = []
    for t in tombos:
        ex_data = {
            "idLivro": idLivro,
            "exeLivTombo": t,
            "exeLivStatus": "Disponível"
        }

        if isbn_padrao:
            ex_data["exeLivISBN"] = isbn_padrao

        ex = supabase.table("ExemplarLivro").insert(ex_data).execute()
        exemplares.append(ex.data[0])

    return {
        "message": f"{quantidade} exemplares adicionados",
        "exemplares": exemplares
    }


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

            livros_titulo = supabase.table("Livro").select("idLivro").ilike("livTitulo", q_str).execute()
            livros_autor = supabase.table("Livro").select("idLivro").ilike("livAutor", q_str).execute()

            ids = set()
            if livros_titulo.data:
                ids.update([l["idLivro"] for l in livros_titulo.data])
            if livros_autor.data:
                ids.update([l["idLivro"] for l in livros_autor.data])

            exemplares_tombo = supabase.table("ExemplarLivro").select("idLivro").ilike("exeLivTombo", q_str).execute()
            if exemplares_tombo.data:
                ids.update([e["idLivro"] for e in exemplares_tombo.data])

            allowed_ids = ids if ids else set()

        if categoria and categoria != "todas":
            try:
                cat_id = int(categoria)
                cats = supabase.table("Livro").select("idLivro").eq("idCategoria", cat_id).execute()
                cat_ids = set([c["idLivro"] for c in (cats.data or [])])
                if allowed_ids is None:
                    allowed_ids = cat_ids
                else:
                    allowed_ids = allowed_ids.intersection(cat_ids)
            except:
                pass

        if status and status.lower() != "todos":
            mapa = {
                "disponivel": "Disponível",
                "emprestado": "Emprestado",
                "reservado": "Reservado"
            }
            cond = mapa.get(status.lower())
            if cond:
                resp = supabase.table("ExemplarLivro").select("idLivro").ilike("exeLivStatus", f"%{cond}%").execute()
                status_ids = set([e["idLivro"] for e in (resp.data or [])])
                if allowed_ids is None:
                    allowed_ids = status_ids
                else:
                    allowed_ids = allowed_ids.intersection(status_ids)

        if isinstance(allowed_ids, set) and len(allowed_ids) == 0:
            return []

        query = supabase.table("Livro").select("*")
        if isinstance(allowed_ids, set):
            query = query.in_("idLivro", list(allowed_ids))

        start = (page - 1) * per_page
        end = start + per_page - 1
        livros = query.range(start, end).execute().data or []

        livro_ids = [l["idLivro"] for l in livros]
        exemplares = []
        if livro_ids:
            exemplares = supabase.table("ExemplarLivro").select("*").in_("idLivro", livro_ids).execute().data or []

        mapa_exemplares = {}
        for ex in exemplares:
            id_livro = ex["idLivro"]
            if id_livro not in mapa_exemplares:
                mapa_exemplares[id_livro] = {
                    "total": 0,
                    "disponiveis": 0,
                    "emprestados": 0,
                    "reservados": 0
                }
            mapa_exemplares[id_livro]["total"] += 1
            status_ex = (ex.get("exeLivStatus") or "").lower()
            if "dispon" in status_ex:
                mapa_exemplares[id_livro]["disponiveis"] += 1
            elif "emprest" in status_ex:
                mapa_exemplares[id_livro]["emprestados"] += 1
            elif "reserv" in status_ex:
                mapa_exemplares[id_livro]["reservados"] += 1

        resultado = []
        for livro in livros:
            stats = mapa_exemplares.get(livro["idLivro"], {
                "total": 0,
                "disponiveis": 0,
                "emprestados": 0,
                "reservados": 0
            })
            resultado.append({
                **livro,
                "total_exemplares": stats["total"],
                "disponiveis": stats["disponiveis"],
                "emprestados": stats["emprestados"],
                "reservados": stats["reservados"],
            })

        return resultado
    except Exception as e:
        print("ERRO:", e)
        raise HTTPException(status_code=500, detail="Erro ao listar livros")


@router.get("/livros/{idLivro}")
def detalhes_livro(idLivro: int):
    livro_resp = supabase.table("Livro").select("*").eq("idLivro", idLivro).execute()
    exemplares_resp = supabase.table("ExemplarLivro").select("*").eq("idLivro", idLivro).execute()
    if not livro_resp.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    livro = livro_resp.data[0]
    llib_isbn = livro.get("exeLivISBN")

    if llib_isbn:
        for ex in exemplares_resp.data:
            if not ex.get("exeLivISBN"):
                supabase.table("ExemplarLivro").update({"exeLivISBN": llib_isbn}).eq("idExemplar", ex.get("idExemplar")).execute()
                ex["exeLivISBN"] = llib_isbn

    return {"livro": livro, "exemplares": exemplares_resp.data}


@router.post("/livros")
def criar_livro(data: LivroCreate, admin=Depends(get_admin)):
    try:
        payload = data.livro.model_dump()
        isbn_padrao = (payload.pop("exemplarISBN", None) or "").strip() or None

        livro_resp = supabase.table("Livro").insert(payload).execute()
        if not livro_resp.data:
            raise HTTPException(status_code=500, detail="Não foi possível criar o livro")

        id_livro = livro_resp.data[0]["idLivro"]
        tombos = gerar_tombos(data.quantidade_exemplares, data.prefixo_tombo)
        exemplares = []

        for t in tombos:
            ex_data = {
                "idLivro": id_livro,
                "exeLivTombo": t,
                "exeLivStatus": "Disponível"
            }
            if isbn_padrao:
                ex_data["exeLivISBN"] = isbn_padrao
            ex = supabase.table("ExemplarLivro").insert(ex_data).execute()
            exemplares.append(ex.data[0])

        return {"livro": livro_resp.data[0], "exemplares": exemplares}
    except HTTPException:
        raise
    except Exception as e:
        print("Erro ao criar livro:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao criar livro: {str(e)}")


@router.put("/livros/{idLivro}")
def atualizar_livro(idLivro: int, livro: Livro, admin=Depends(get_admin)):
    try:
        payload = livro.model_dump()
        isbn_padrao = (payload.pop("exemplarISBN", None) or "").strip() or None

        resp = supabase.table("Livro").update(payload).eq("idLivro", idLivro).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Livro não encontrado")

        if isbn_padrao:
            supabase.table("ExemplarLivro").update({"exeLivISBN": isbn_padrao}).eq("idLivro", idLivro).execute()

        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print("Erro ao atualizar livro:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar livro: {str(e)}")


@router.delete("/livros/{idLivro}")
def deletar_livro(idLivro: int, admin=Depends(get_admin)):
    supabase.table("ExemplarLivro").delete().eq("idLivro", idLivro).execute()
    supabase.table("Livro").delete().eq("idLivro", idLivro).execute()
    return {"message": "Livro removido"}


@router.put("/exemplares/{idExemplar}")
def atualizar_exemplar(idExemplar: int, data: ExemplarUpdate, admin=Depends(get_admin)):
    resp = supabase.table("ExemplarLivro").select("*").eq("idExemplar", idExemplar).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Exemplar não encontrado")

    payload = {}
    if data.exeLivTombo is not None:
        payload["exeLivTombo"] = data.exeLivTombo
    if data.exeLivStatus is not None:
        payload["exeLivStatus"] = data.exeLivStatus
    if data.exeLivISBN is not None:
        payload["exeLivISBN"] = data.exeLivISBN
    if data.exeLivDescricao is not None:
        payload["exeLivDescricao"] = data.exeLivDescricao

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    atual = supabase.table("ExemplarLivro").update(payload).eq("idExemplar", idExemplar).execute()
    return atual.data[0]


@router.get("/exemplares")
def listar_exemplares(admin=Depends(get_admin)):
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
        print("Erro exemplares:", e)
        return []


@router.get("/exemplares/disponiveis")
def exemplares_disponiveis(admin=Depends(get_admin)):
    try:
        exemplares = (
            supabase
            .table("ExemplarLivro")
            .select("idExemplar, exeLivTombo, idLivro")
            .ilike("exeLivStatus", "%Disponível%")
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
        print("Erro exemplares:", e)
        return []
