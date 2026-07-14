from fastapi import APIRouter, Depends, HTTPException
from database import supabase
from core import get_admin
from schemas import Autor, AutorUpdate, MesclarPayload

router = APIRouter()

@router.get("/autores")
def listar_autores():
    try:
        res = supabase.table("Autor").select("*").order("autNome").execute()
        autores = res.data or []
        if autores:
            links = supabase.table("LivroAutor").select("idAutor").execute().data or []
            contagem = {}
            for l in links:
                contagem[l["idAutor"]] = contagem.get(l["idAutor"], 0) + 1
            for a in autores:
                a["total_livros"] = contagem.get(a["idAutor"], 0)
        return autores
    except Exception as e:
        print("Erro ao listar autores:", e)
        raise HTTPException(status_code=500, detail="Erro ao listar autores")

@router.post("/autores")
def criar_autor(autor: Autor, admin=Depends(get_admin)):
    try:
        if not autor.autNome or not autor.autNome.strip():
            raise HTTPException(status_code=400, detail="Nome do autor é obrigatório")
        
        res = supabase.table("Autor").insert(autor.dict()).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Falha ao criar autor")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "duplicate key" in error_msg or "23505" in error_msg:
            raise HTTPException(status_code=409, detail="Autor já existe")
        print("Erro ao criar autor:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao criar autor: {str(e)}")

@router.put("/autores/{idAutor}")
def atualizar_autor(idAutor: int, autor: AutorUpdate, admin=Depends(get_admin)):
    """Permite editar um autor já cadastrado — por exemplo, para acrescentar
    o ano de falecimento quando ele se torna conhecido depois do cadastro."""
    try:
        payload = {k: v for k, v in autor.dict().items() if v is not None}
        if not payload:
            raise HTTPException(status_code=400, detail="Nenhum campo para atualizar.")
        res = supabase.table("Autor").update(payload).eq("idAutor", idAutor).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Autor não encontrado")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print("Erro ao atualizar autor:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar autor: {str(e)}")


@router.get("/autores/{idAutor}/uso")
def contar_uso_autor(idAutor: int, admin=Depends(get_admin)):
    """Retorna quantos livros estão vinculados a esse autor."""
    try:
        res = (
            supabase.table("LivroAutor")
            .select("idLivro", count="exact")
            .eq("idAutor", idAutor)
            .execute()
        )
        return {"total_livros": res.count or 0}
    except Exception as e:
        print("Erro ao contar uso do autor:", e)
        raise HTTPException(status_code=500, detail="Erro ao verificar uso do autor")


@router.delete("/autores/{idAutor}")
def excluir_autor(idAutor: int, admin=Depends(get_admin)):
    try:
        vinculo = (
            supabase.table("LivroAutor")
            .select("idLivro", count="exact")
            .eq("idAutor", idAutor)
            .execute()
        )
        total = vinculo.count or 0
        if total > 0:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Este autor está vinculado a {total} livro(s). "
                    "Use a opção de mesclar para transferir os livros antes de excluir."
                ),
            )

        res = supabase.table("Autor").delete().eq("idAutor", idAutor).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Autor não encontrado")
        return {"detail": "Autor excluído com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        print("Erro ao excluir autor:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao excluir autor: {str(e)}")


@router.post("/autores/{idAutor}/mesclar")
def mesclar_autor(idAutor: int, payload: MesclarPayload, admin=Depends(get_admin)):
    """Transfere todos os livros vinculados a `idAutor` para `idDestino`
    e em seguida exclui o autor de origem."""
    try:
        id_destino = payload.idDestino
        if id_destino == idAutor:
            raise HTTPException(status_code=400, detail="Selecione um autor diferente do original")

        destino = (
            supabase.table("Autor")
            .select("idAutor")
            .eq("idAutor", id_destino)
            .limit(1)
            .execute()
        )
        if not destino.data:
            raise HTTPException(status_code=404, detail="Autor de destino não encontrado")

        origem_links = (
            supabase.table("LivroAutor").select("idLivro").eq("idAutor", idAutor).execute().data or []
        )
        destino_links = (
            supabase.table("LivroAutor").select("idLivro").eq("idAutor", id_destino).execute().data or []
        )
        destino_ids = {l["idLivro"] for l in destino_links}
        para_mover = [l["idLivro"] for l in origem_links if l["idLivro"] not in destino_ids]

        if para_mover:
            novas_linhas = [{"idLivro": idLivro, "idAutor": id_destino} for idLivro in para_mover]
            supabase.table("LivroAutor").insert(novas_linhas).execute()

        supabase.table("LivroAutor").delete().eq("idAutor", idAutor).execute()
        supabase.table("Autor").delete().eq("idAutor", idAutor).execute()

        return {
            "detail": "Autores mesclados com sucesso",
            "livros_migrados": len(para_mover),
        }
    except HTTPException:
        raise
    except Exception as e:
        print("Erro ao mesclar autores:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao mesclar autores: {str(e)}")