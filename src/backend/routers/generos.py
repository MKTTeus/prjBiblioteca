from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin
from schemas import Genero

router = APIRouter()

@router.get("/generos")
def listar_generos():
    try:
        res = supabase.table("Genero").select("*").order("genNome").execute()
        return res.data or []
    except Exception as e:
        print("Erro ao listar gêneros:", e)
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
        print("Erro ao criar gênero:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao criar gênero: {str(e)}")
