from fastapi import APIRouter, Depends

from database import supabase
from core import get_admin
from schemas import Genero

router = APIRouter()

@router.get("/generos")
def listar_generos():
    try:
        res = supabase.table("GeneroLivro").select("*").execute()
        return res.data or []
    except Exception as e:
        print("Erro generos:", e)
        return []

@router.post("/generos")
def criar_genero(gen: Genero, admin=Depends(get_admin)):
    res = supabase.table("GeneroLivro").insert(gen.dict()).execute()
    return res.data[0]
