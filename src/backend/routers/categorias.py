from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin
from schemas import Categoria, CategoriaUpdate, MesclarPayload

router = APIRouter()

@router.get("/categorias")
def listar_categorias():
    try:
        res = supabase.table("Categoria").select("*").order("catNome").execute()
        categorias = res.data or []
        if categorias:
            links = supabase.table("LivroCategoria").select("idCategoria").execute().data or []
            contagem = {}
            for l in links:
                contagem[l["idCategoria"]] = contagem.get(l["idCategoria"], 0) + 1
            for c in categorias:
                c["total_livros"] = contagem.get(c["idCategoria"], 0)
        return categorias
    except Exception as e:
        print("Erro ao listar categorias:", e)
        raise HTTPException(status_code=500, detail="Erro ao listar categorias")

@router.post("/categorias")
def criar_categoria(cat: Categoria, admin=Depends(get_admin)):
    try:
        if not cat.catNome or not cat.catNome.strip():
            raise HTTPException(status_code=400, detail="Nome da categoria é obrigatório")

        res = supabase.table("Categoria").insert(cat.dict()).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Falha ao criar categoria")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "duplicate key" in error_msg or "23505" in error_msg:
            raise HTTPException(status_code=409, detail="Categoria já existe")
        print("Erro ao criar categoria:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao criar categoria: {str(e)}")


@router.get("/categorias/{idCategoria}/uso")
def contar_uso_categoria(idCategoria: int, admin=Depends(get_admin)):
    """Retorna quantos livros estão vinculados a essa categoria."""
    try:
        res = (
            supabase.table("LivroCategoria")
            .select("idLivro", count="exact")
            .eq("idCategoria", idCategoria)
            .execute()
        )
        return {"total_livros": res.count or 0}
    except Exception as e:
        print("Erro ao contar uso da categoria:", e)
        raise HTTPException(status_code=500, detail="Erro ao verificar uso da categoria")


@router.put("/categorias/{idCategoria}")
def atualizar_categoria(idCategoria: int, cat: CategoriaUpdate, admin=Depends(get_admin)):
    try:
        nome = (cat.catNome or "").strip()
        if not nome:
            raise HTTPException(status_code=400, detail="Nome da categoria é obrigatório")

        res = (
            supabase.table("Categoria")
            .update({"catNome": nome})
            .eq("idCategoria", idCategoria)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "duplicate key" in error_msg or "23505" in error_msg:
            raise HTTPException(status_code=409, detail="Já existe uma categoria com esse nome")
        print("Erro ao atualizar categoria:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar categoria: {str(e)}")


@router.delete("/categorias/{idCategoria}")
def excluir_categoria(idCategoria: int, admin=Depends(get_admin)):
    try:
        vinculo = (
            supabase.table("LivroCategoria")
            .select("idLivro", count="exact")
            .eq("idCategoria", idCategoria)
            .execute()
        )
        total = vinculo.count or 0
        if total > 0:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Esta categoria está vinculada a {total} livro(s). "
                    "Use a opção de mesclar para transferir os livros antes de excluir."
                ),
            )

        res = supabase.table("Categoria").delete().eq("idCategoria", idCategoria).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        return {"detail": "Categoria excluída com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        print("Erro ao excluir categoria:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao excluir categoria: {str(e)}")


@router.post("/categorias/{idCategoria}/mesclar")
def mesclar_categoria(idCategoria: int, payload: MesclarPayload, admin=Depends(get_admin)):
    """Transfere todos os livros vinculados a `idCategoria` para `idDestino`
    e em seguida exclui a categoria de origem. Útil para corrigir cadastros
    duplicados (ex.: "Romance" -> "Romances")."""
    try:
        id_destino = payload.idDestino
        if id_destino == idCategoria:
            raise HTTPException(status_code=400, detail="Selecione uma categoria diferente da original")

        destino = (
            supabase.table("Categoria")
            .select("idCategoria")
            .eq("idCategoria", id_destino)
            .limit(1)
            .execute()
        )
        if not destino.data:
            raise HTTPException(status_code=404, detail="Categoria de destino não encontrada")

        origem_links = (
            supabase.table("LivroCategoria").select("idLivro").eq("idCategoria", idCategoria).execute().data or []
        )
        destino_links = (
            supabase.table("LivroCategoria").select("idLivro").eq("idCategoria", id_destino).execute().data or []
        )
        destino_ids = {l["idLivro"] for l in destino_links}
        para_mover = [l["idLivro"] for l in origem_links if l["idLivro"] not in destino_ids]

        if para_mover:
            novas_linhas = [{"idLivro": idLivro, "idCategoria": id_destino} for idLivro in para_mover]
            supabase.table("LivroCategoria").insert(novas_linhas).execute()

        # Remove todos os vínculos remanescentes com a categoria de origem
        # (os que foram movidos e os que já existiam em ambas as categorias)
        supabase.table("LivroCategoria").delete().eq("idCategoria", idCategoria).execute()
        supabase.table("Categoria").delete().eq("idCategoria", idCategoria).execute()

        return {
            "detail": "Categorias mescladas com sucesso",
            "livros_migrados": len(para_mover),
        }
    except HTTPException:
        raise
    except Exception as e:
        print("Erro ao mesclar categorias:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao mesclar categorias: {str(e)}")
