from fastapi import APIRouter
from database import supabase

router = APIRouter()

@router.get("/categorias")
async def listar_categorias():
    resp = supabase.table("CategoriaLivro").select("*").execute()
    return resp.data