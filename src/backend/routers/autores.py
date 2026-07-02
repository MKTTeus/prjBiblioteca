from fastapi import APIRouter, Depends
from database import supabase
from core import get_admin
from schemas import Autor

router = APIRouter()

@router.get("/autores")
def listar_autores():
    try:
        res = supabase.table("Autor").select("*").execute()
        return res.data or []
    except Exception as e:
        print("Erro autores:", e)
        return []

@router.post("/autores")
def criar_autor(autor: Autor, admin=Depends(get_admin)):
    res = supabase.table("Autor").insert(autor.dict()).execute()
    return res.data[0]