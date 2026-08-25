import ipaddress
import os
import socket
import uuid
from io import BytesIO
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image

from core import get_admin
from database import supabase

router = APIRouter()

# Bucket público no Supabase Storage. Precisa existir e estar marcado como
# "Public bucket" (Storage → capas → Edit bucket → Public bucket). Sem isso,
# o upload funciona normalmente (o backend usa a service role, que ignora
# RLS), mas o navegador não consegue carregar a URL pública da imagem —
# o arquivo fica salvo no bucket, mas a capa nunca aparece no sistema.
CAPA_BUCKET = "capas"


def excluir_capa_do_storage(url: str) -> None:
    """Remove uma capa do bucket `capas` quando a URL pertence ao Storage.
    URLs externas são ignoradas. Falhas de remoção são silenciadas para não
    impedir a operação principal sobre o livro."""
    if not url or not isinstance(url, str):
        return

    prefixo = f"{SUPABASE_URL}/storage/v1/object/public/{CAPA_BUCKET}/"
    if not SUPABASE_URL or not url.startswith(prefixo):
        return

    nome_arquivo = url[len(prefixo):].split("?", 1)[0].lstrip("/")
    if not nome_arquivo:
        return

    try:
        supabase.storage.from_(CAPA_BUCKET).remove([nome_arquivo])
    except Exception as e:
        print(f"Erro ao excluir capa do Storage ({nome_arquivo}): {e}")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")

EXTENSOES_PERMITIDAS = {"jpg", "jpeg", "png", "webp", "gif"}
TAMANHO_MAXIMO_MB = 5


DIMENSAO_MAXIMA_PX = 1600

QUALIDADE_WEBP = 88


def _extensao_valida(nome_arquivo: str) -> str | None:
    if "." not in nome_arquivo:
        return None
    ext = nome_arquivo.rsplit(".", 1)[-1].lower()
    return ext if ext in EXTENSOES_PERMITIDAS else None


def _comprimir_capa(conteudo: bytes, ext: str, content_type: str) -> tuple[bytes, str, str]:
    """Recomprime a imagem da capa sem perda visual perceptível, convertendo
    para WebP. Se a imagem não puder ser processada (arquivo corrompido,
    GIF animado, ou o resultado não ficar menor que o original), devolve o
    conteúdo original sem alterações."""
    try:
        imagem = Image.open(BytesIO(conteudo))
        imagem.load()
    except Exception:
        # Não conseguimos abrir como imagem (arquivo corrompido/formato
        # exótico) — melhor manter o original do que falhar o upload.
        return conteudo, ext, content_type

    # GIFs animados: preserva como está, para não perder a animação.
    if getattr(imagem, "is_animated", False):
        return conteudo, ext, content_type

    # Reduz apenas se a imagem for maior do que o necessário — mantém a
    # proporção e não amplia imagens menores.
    if max(imagem.size) > DIMENSAO_MAXIMA_PX:
        imagem.thumbnail((DIMENSAO_MAXIMA_PX, DIMENSAO_MAXIMA_PX), Image.LANCZOS)

    tem_transparencia = imagem.mode in ("RGBA", "LA") or (
        imagem.mode == "P" and "transparency" in imagem.info
    )

    buffer = BytesIO()
    try:
        if tem_transparencia:
            imagem.convert("RGBA").save(
                buffer, format="WEBP", quality=QUALIDADE_WEBP, method=6
            )
        else:
            imagem.convert("RGB").save(
                buffer, format="WEBP", quality=QUALIDADE_WEBP, method=6
            )
    except Exception:
        return conteudo, ext, content_type

    novo_conteudo = buffer.getvalue()

    # Só troca pelo resultado comprimido se ele realmente for menor —
    # evita "compressão" que aumenta o arquivo em casos raros.
    if novo_conteudo and len(novo_conteudo) < len(conteudo):
        return novo_conteudo, "webp", "image/webp"

    return conteudo, ext, content_type


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

    content_type = file.content_type or "application/octet-stream"

    # Recomprime a imagem (sem perda visual perceptível) antes de subir para
    # o Storage — reduz o espaço ocupado no bucket e acelera o carregamento
    # das capas na listagem de livros.
    conteudo, ext, content_type = _comprimir_capa(conteudo, ext, content_type)

    nome_arquivo = f"{uuid.uuid4().hex}.{ext}"

    try:
        supabase.storage.from_(CAPA_BUCKET).upload(
            path=nome_arquivo,
            file=conteudo,
            file_options={"content-type": content_type},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao enviar a capa: {e}")

    return {"url": _montar_public_url(nome_arquivo)}


# ── Buscar capa a partir de um link externo ──────────────────────────────
# Usado pelo editor de capa (CoverImageEditor) para permitir ajustar
# (girar/recortar) tanto uma imagem informada por URL quanto a capa já
# salva no livro. O download acontece aqui no backend — e não direto no
# navegador — porque a maioria dos sites não libera CORS para suas imagens,
# o que deixaria o <canvas> "tainted" e impediria exportar o recorte.

TAMANHO_MAXIMO_URL_MB = 8
TIMEOUT_BUSCA_URL_SEGUNDOS = 10.0


def _host_e_seguro(hostname: str) -> bool:
    """Bloqueia hosts que resolvem para endereços privados/locais, para
    reduzir o risco de SSRF através desse proxy de imagens. Não é uma
    proteção completa (não revalida o host a cada redirecionamento), mas
    cobre o caso comum de alguém apontar para localhost/rede interna."""
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            continue
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
    return True


@router.get("/buscar-capa-por-url")
async def buscar_capa_por_url(url: str, admin=Depends(get_admin)):
    """Baixa a imagem apontada por `url` e devolve os bytes (com o
    content-type original) para o frontend montar um File e abrir no
    CoverImageEditor, como se o usuário tivesse escolhido um arquivo."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise HTTPException(status_code=400, detail="URL inválida.")
    if not _host_e_seguro(parsed.hostname):
        raise HTTPException(status_code=400, detail="Esse endereço não pode ser acessado.")

    try:
        async with httpx.AsyncClient(
            follow_redirects=True, timeout=TIMEOUT_BUSCA_URL_SEGUNDOS, max_redirects=3
        ) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (BibliotecaEscolar)"})
    except httpx.HTTPError:
        raise HTTPException(status_code=400, detail="Não foi possível baixar a imagem desse link.")

    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Não foi possível baixar a imagem desse link.")

    content_type = resp.headers.get("content-type", "").split(";")[0].strip().lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Esse link não aponta para uma imagem.")

    conteudo = resp.content
    if not conteudo:
        raise HTTPException(status_code=400, detail="Não foi possível baixar a imagem desse link.")
    if len(conteudo) > TAMANHO_MAXIMO_URL_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"A imagem desse link deve ter no máximo {TAMANHO_MAXIMO_URL_MB}MB.",
        )

    return Response(content=conteudo, media_type=content_type)