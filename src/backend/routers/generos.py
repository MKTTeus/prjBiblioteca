from fastapi import APIRouter
from database import supabase

router = APIRouter()

@router.get("/generos")
async def listar_generos():
    resp = supabase.table("GeneroLivro").select("*").execute()
    return resp.data