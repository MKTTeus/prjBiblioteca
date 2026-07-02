from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin
from schemas import Categoria

router = APIRouter()

@router.get("/categorias")
def listar_categorias():
    try:
        res = supabase.table("Categoria").select("*").order("catNome").execute()
        return res.data or []
    except Exception as e:
        print("Erro ao listar categorias:", e)
        raise HTTPException(status_code=500, detail="Erro ao listar categorias")

@router.post("/categorias")
def criar_categoria(cat: Categoria, admin=Depends(get_admin)):
    try:
        res = supabase.table("Categoria").insert(cat.dict()).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Falha ao criar categoria")
        return res.data[0]
    except Exception as e:
        print("Erro ao criar categoria:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao criar categoria: {str(e)}")
