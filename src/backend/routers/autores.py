from rpc import executar_rpc
from core import consultar_completo, consultar_lote
from fastapi import APIRouter, Depends, HTTPException, Query
from .livros_vinculados import listar_livros_vinculados
from database import supabase
from core import get_admin
from schemas import Autor, AutorUpdate, MesclarPayload

router = APIRouter()

@router.get("/autores")
def listar_autores():
    try:
        res = consultar_completo(lambda: supabase.table('Autor').select('*').order('autNome'), 'Autor')
        autores = res.data or []
        if autores:
            links = consultar_completo(lambda: supabase.table('LivroAutor').select('idAutor'), 'LivroAutor').data or []
            contagem = {}
            for l in links:
                contagem[l["idAutor"]] = contagem.get(l["idAutor"], 0) + 1
            for a in autores:
                a["total_livros"] = contagem.get(a["idAutor"], 0)
        return autores
    except Exception as e:
        print("Erro ao listar autores:", 'falha de operação')
        raise HTTPException(status_code=503, detail="Não foi possível carregar a lista de autores. Verifique sua conexão e tente novamente.") from e

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
        print("Erro ao criar autor:", 'falha de operação')
        raise HTTPException(status_code=503, detail="Não foi possível cadastrar o autor por uma falha temporária ao salvar os dados. Confira se o autor foi incluído antes de tentar novamente.") from e

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
        print("Erro ao atualizar autor:", 'falha de operação')
        raise HTTPException(status_code=503, detail="Não foi possível atualizar o autor por uma falha temporária ao salvar os dados. Confira o cadastro antes de tentar novamente.") from e


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
        print("Erro ao contar uso do autor:", 'falha de operação')
        raise HTTPException(status_code=503, detail="Não foi possível verificar os livros vinculados a este autor. Tente novamente.") from e


@router.get("/autores/{idAutor}/livros")
def livros_do_autor(idAutor: int, pagina: int = Query(1, ge=1), admin=Depends(get_admin)):
    try:
        return listar_livros_vinculados("LivroAutor", "idAutor", idAutor, pagina)
    except Exception as e:
        raise HTTPException(status_code=503, detail="Não foi possível carregar os livros deste autor. Tente novamente.") from e


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
        print("Erro ao excluir autor:", 'falha de operação')
        raise HTTPException(status_code=503, detail="Não foi possível excluir o autor por uma falha temporária. Verifique se ele continua na lista antes de repetir a ação.") from e


@router.post("/autores/{idAutor}/mesclar")
def mesclar_autor(idAutor:int,payload:MesclarPayload,admin=Depends(get_admin)):
    return executar_rpc('mesclar_catalogo',{'p_tipo':'Autor','p_origem':idAutor,'p_destino':payload.idDestino})
