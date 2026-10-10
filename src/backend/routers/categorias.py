from rpc import executar_rpc
from core import consultar_completo, consultar_lote
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin
from schemas import Categoria, CategoriaUpdate, MesclarPayload

router = APIRouter()

@router.get("/categorias")
def listar_categorias():
    try:
        res = consultar_completo(lambda: supabase.table('Categoria').select('*').order('catNome'), 'Categoria')
        categorias = res.data or []
        if categorias:
            links = consultar_completo(lambda: supabase.table('LivroCategoria').select('idCategoria'), 'LivroCategoria').data or []
            contagem = {}
            for l in links:
                contagem[l["idCategoria"]] = contagem.get(l["idCategoria"], 0) + 1
            for c in categorias:
                c["total_livros"] = contagem.get(c["idCategoria"], 0)
        return categorias
    except Exception as e:
        print("Erro ao listar categorias:", 'falha de operação')
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
        print("Erro ao criar categoria:", 'falha de operação')
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')


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
        print("Erro ao contar uso da categoria:", 'falha de operação')
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
        print("Erro ao atualizar categoria:", 'falha de operação')
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')


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
        print("Erro ao excluir categoria:", 'falha de operação')
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')


@router.post("/categorias/{idCategoria}/mesclar")
def mesclar_categoria(idCategoria:int,payload:MesclarPayload,admin=Depends(get_admin)):
    return executar_rpc('mesclar_catalogo',{'p_tipo':'Categoria','p_origem':idCategoria,'p_destino':payload.idDestino})
