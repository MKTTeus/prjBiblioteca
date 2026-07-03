import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from core import get_admin
from database import supabase

router = APIRouter()

# Bucket público no Supabase Storage. Precisa existir e estar marcado como
# "Public bucket" (Storage → capas → Edit bucket → Public bucket). Sem isso,
# o upload funciona normalmente (o backend usa a service role, que ignora
# RLS), mas o navegador não consegue carregar a URL pública da imagem —
# o arquivo fica salvo no bucket, mas a capa nunca aparece no sistema.
CAPA_BUCKET = "capas"

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")

EXTENSOES_PERMITIDAS = {"jpg", "jpeg", "png", "webp", "gif"}
TAMANHO_MAXIMO_MB = 5


def _extensao_valida(nome_arquivo: str) -> str | None:
    if "." not in nome_arquivo:
        return None
    ext = nome_arquivo.rsplit(".", 1)[-1].lower()
    return ext if ext in EXTENSOES_PERMITIDAS else None


def _montar_public_url(path: str) -> str:
    """Monta a URL pública manualmente a partir de SUPABASE_URL, em vez de
    confiar no retorno de get_public_url (que muda de formato entre
    supabase-py v1/v2 e já foi motivo de URL inválida sem erro nenhum)."""
    return f"{SUPABASE_URL}/storage/v1/object/public/{CAPA_BUCKET}/{path}"


@router.post("/upload-capa")
async def upload_capa(file: UploadFile = File(...), admin=Depends(get_admin)):
    """Recebe a imagem de capa enviada no formulário de livros, faz upload
    para o Supabase Storage (bucket público) e devolve a URL pública que é
    salva em Livro.livCapaURL — o mesmo campo preenchido quando a capa é
    informada por link."""
    ext = _extensao_valida(file.filename or "")
    if not ext:
        raise HTTPException(
            status_code=400,
            detail="Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF.",
        )

    conteudo = await file.read()
    if not conteudo:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")
    if len(conteudo) > TAMANHO_MAXIMO_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"A imagem deve ter no máximo {TAMANHO_MAXIMO_MB}MB.",
        )

    if not SUPABASE_URL:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL não configurada no backend — não é possível montar a URL pública da capa.",
        )

    nome_arquivo = f"{uuid.uuid4().hex}.{ext}"
    content_type = file.content_type or "application/octet-stream"

    try:
        supabase.storage.from_(CAPA_BUCKET).upload(
            path=nome_arquivo,
            file=conteudo,
            file_options={"content-type": content_type},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao enviar a capa: {e}")

    return {"url": _montar_public_url(nome_arquivo)}