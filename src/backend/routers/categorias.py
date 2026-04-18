from fastapi import APIRouter, Depends

from database import supabase
from core import get_admin
from schemas import Categoria

router = APIRouter()

@router.get("/categorias")
def listar_categorias():
    try:
        res = supabase.table("CategoriaLivro").select("*").execute()
        return res.data or []
    except Exception as e:
        print("Erro categorias:", e)
        return []

@router.post("/categorias")
def criar_categoria(cat: Categoria, admin=Depends(get_admin)):
    res = supabase.table("CategoriaLivro").insert(cat.dict()).execute()
    return res.data[0]
