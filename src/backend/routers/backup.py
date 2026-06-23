from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from database import supabase
from core import get_admin

router = APIRouter()

TABELAS = [
    "Usuario", "Administrador", "Livro", "Exemplar",
    "Autor", "Editora", "Categoria", "Genero",
    "LivroAutor", "LivroCategoria", "LivroGenero",
    "Movimentacao", "MovimentacaoExemplar", "Configuracoes",
]

@router.get("/backup/completo")
def backup_completo(admin=Depends(get_admin)):
    dados = {}
    for tabela in TABELAS:
        try:
            resp = supabase.table(tabela).select("*").execute()
            dados[tabela] = resp.data or []
        except Exception as e:
            dados[tabela] = {"erro": str(e)}

    return JSONResponse(
        content={
            "gerado_em": datetime.utcnow().isoformat(),
            "tabelas": TABELAS,
            "dados": dados,
        },
        headers={
            "Content-Disposition": f'attachment; filename="backup_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json"'
        }
    )