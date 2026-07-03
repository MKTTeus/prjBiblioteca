import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from core import get_admin
from database import supabase

router = APIRouter()

# Bucket público no Supabase Storage. Precisa existir e estar marcado como
# "Public bucket" (mesma ideia do bucket "backups", só que esse pode ser
# lido publicamente para exibir a capa no site).
CAPA_BUCKET = "capas"

EXTENSOES_PERMITIDAS = {"jpg", "jpeg", "png", "webp", "gif"}
TAMANHO_MAXIMO_MB = 5


def _extensao_valida(nome_arquivo: str) -> str | None:
    if "." not in nome_arquivo:
        return None
    ext = nome_arquivo.rsplit(".", 1)[-1].lower()
    return ext if ext in EXTENSOES_PERMITIDAS else None


def _extrair_public_url(resp) -> str | None:
    """Extrai a URL pública compatível com supabase-py v1 e v2."""
    if isinstance(resp, str):
        return resp
    if isinstance(resp, dict):
        return resp.get("publicURL") or resp.get("publicUrl") or resp.get("public_url")
    return getattr(resp, "public_url", None) or getattr(resp, "publicURL", None)


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

    url = _extrair_public_url(
        supabase.storage.from_(CAPA_BUCKET).get_public_url(nome_arquivo)
    )
    if not url:
        raise HTTPException(
            status_code=500,
            detail=(
                "Capa enviada, mas não foi possível gerar a URL pública. "
                f"Verifique se o bucket '{CAPA_BUCKET}' existe e está "
                "configurado como público no Supabase Storage."
            ),
        )

    return {"url": url}