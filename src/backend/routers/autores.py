from fastapi import APIRouter, Depends, HTTPException
from database import supabase
from core import get_admin
from schemas import Autor

router = APIRouter()

@router.get("/autores")
def listar_autores():
    try:
        res = supabase.table("Autor").select("*").order("autNome").execute()
        return res.data or []
    except Exception as e:
        print("Erro ao listar autores:", e)
        raise HTTPException(status_code=500, detail="Erro ao listar autores")

@router.post("/autores")
def criar_autor(autor: Autor, admin=Depends(get_admin)):
    try:
        res = supabase.table("Autor").insert(autor.dict()).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Falha ao criar autor")
        return res.data[0]
    except Exception as e:
        print("Erro ao criar autor:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao criar autor: {str(e)}")