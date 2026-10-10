from rpc import executar_rpc
from core import consultar_completo, consultar_lote
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin
from schemas import Genero, GeneroUpdate, MesclarPayload

router = APIRouter()

@router.get("/generos")
def listar_generos():
    try:
        res = consultar_completo(lambda: supabase.table('Genero').select('*').order('genNome'), 'Genero')
        generos = res.data or []
        if generos:
            links = consultar_completo(lambda: supabase.table('LivroGenero').select('idGenero'), 'LivroGenero').data or []
            contagem = {}
            for l in links:
                contagem[l["idGenero"]] = contagem.get(l["idGenero"], 0) + 1
            for g in generos:
                g["total_livros"] = contagem.get(g["idGenero"], 0)
        return generos
    except Exception as e:
        print("Erro ao listar gêneros:", 'falha de operação')
        raise HTTPException(status_code=500, detail="Erro ao listar gêneros")

@router.post("/generos")
def criar_genero(gen: Genero, admin=Depends(get_admin)):
    try:
        if not gen.genNome or not gen.genNome.strip():
            raise HTTPException(status_code=400, detail="Nome do gênero é obrigatório")

        res = supabase.table("Genero").insert(gen.dict()).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Falha ao criar gênero")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "duplicate key" in error_msg or "23505" in error_msg:
            raise HTTPException(status_code=409, detail="Gênero já existe")
        print("Erro ao criar gênero:", 'falha de operação')
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')


@router.get("/generos/{idGenero}/uso")
def contar_uso_genero(idGenero: int, admin=Depends(get_admin)):
    """Retorna quantos livros estão vinculados a esse gênero."""
    try:
        res = (
            supabase.table("LivroGenero")
            .select("idLivro", count="exact")
            .eq("idGenero", idGenero)
            .execute()
        )
        return {"total_livros": res.count or 0}
    except Exception as e:
        print("Erro ao contar uso do gênero:", 'falha de operação')
        raise HTTPException(status_code=500, detail="Erro ao verificar uso do gênero")


@router.put("/generos/{idGenero}")
def atualizar_genero(idGenero: int, gen: GeneroUpdate, admin=Depends(get_admin)):
    try:
        nome = (gen.genNome or "").strip()
        if not nome:
            raise HTTPException(status_code=400, detail="Nome do gênero é obrigatório")

        res = (
            supabase.table("Genero")
            .update({"genNome": nome})
            .eq("idGenero", idGenero)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Gênero não encontrado")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "duplicate key" in error_msg or "23505" in error_msg:
            raise HTTPException(status_code=409, detail="Já existe um gênero com esse nome")
        print("Erro ao atualizar gênero:", 'falha de operação')
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')


@router.delete("/generos/{idGenero}")
def excluir_genero(idGenero: int, admin=Depends(get_admin)):
    try:
        vinculo = (
            supabase.table("LivroGenero")
            .select("idLivro", count="exact")
            .eq("idGenero", idGenero)
            .execute()
        )
        total = vinculo.count or 0
        if total > 0:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Este gênero está vinculado a {total} livro(s). "
                    "Use a opção de mesclar para transferir os livros antes de excluir."
                ),
            )

        res = supabase.table("Genero").delete().eq("idGenero", idGenero).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Gênero não encontrado")
        return {"detail": "Gênero excluído com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        print("Erro ao excluir gênero:", 'falha de operação')
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')


@router.post("/generos/{idGenero}/mesclar")
def mesclar_genero(idGenero:int,payload:MesclarPayload,admin=Depends(get_admin)):
    return executar_rpc('mesclar_catalogo',{'p_tipo':'Genero','p_origem':idGenero,'p_destino':payload.idDestino})
