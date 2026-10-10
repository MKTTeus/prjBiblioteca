import asyncio
import warnings
from urllib.parse import urljoin
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
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error',Image.DecompressionBombWarning)
            imagem=Image.open(BytesIO(conteudo))
            if imagem.format not in ('JPEG','PNG','WEBP','GIF') or imagem.width*imagem.height>16000000: raise ValueError('Imagem inválida')
            imagem.load()
        imagem.thumbnail((DIMENSAO_MAXIMA_PX,DIMENSAO_MAXIMA_PX),Image.Resampling.LANCZOS)
        buffer=BytesIO(); imagem.convert('RGBA' if 'A' in imagem.getbands() else 'RGB').save(buffer,format='WEBP',quality=QUALIDADE_WEBP)
        return buffer.getvalue(),'webp','image/webp'
    except Exception as exc:
        raise HTTPException(422,'Imagem inválida, corrompida ou maior que 16 megapixels') from exc


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

    conteudo = await file.read(TAMANHO_MAXIMO_MB*1024*1024+1)
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
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')

    return {"url": _montar_public_url(nome_arquivo)}


# ── Buscar capa a partir de um link externo ──────────────────────────────
# Usado pelo editor de capa (CoverImageEditor) para permitir ajustar
# (girar/recortar) tanto uma imagem informada por URL quanto a capa já
# salva no livro. O download acontece aqui no backend — e não direto no
# navegador — porque a maioria dos sites não libera CORS para suas imagens,
# o que deixaria o <canvas> "tainted" e impediria exportar o recorte.

TAMANHO_MAXIMO_URL_MB = 8
TIMEOUT_BUSCA_URL_SEGUNDOS = 10.0


def _resolver_host_seguro(hostname: str, porta: int):
    try: infos=socket.getaddrinfo(hostname,porta,type=socket.SOCK_STREAM)
    except socket.gaierror as exc: raise HTTPException(400,'Endereço não encontrado') from exc
    ips=list(dict.fromkeys(i[4][0] for i in infos))
    if not ips or any(not ipaddress.ip_address(ip).is_global for ip in ips): raise HTTPException(400,'Endereço não permitido')
    return ips[0]


def _host_e_seguro(hostname: str) -> bool:
    try: _resolver_host_seguro(hostname,443); return True
    except HTTPException: return False


@router.get("/buscar-capa-por-url")
async def buscar_capa_por_url(url: str, admin=Depends(get_admin)):
    try:
        async with httpx.AsyncClient(follow_redirects=False,trust_env=False,timeout=TIMEOUT_BUSCA_URL_SEGUNDOS) as client:
            for passo in range(4):
                parsed=urlparse(url)
                try: porta=parsed.port or (443 if parsed.scheme=='https' else 80)
                except ValueError: raise HTTPException(400,'URL inválida')
                if parsed.scheme not in ('http','https') or not parsed.hostname or parsed.username or parsed.password or porta not in (80,443): raise HTTPException(400,'URL inválida')
                ip=await asyncio.to_thread(_resolver_host_seguro,parsed.hostname,porta)
                # Conecta no IP que foi validado, mantendo Host e SNI do servidor original.
                destino=httpx.URL(url).copy_with(host=ip)
                async with client.stream('GET',destino,headers={'Host':parsed.netloc},extensions={'sni_hostname':parsed.hostname}) as resp:
                    if resp.status_code in (301,302,303,307,308):
                        if passo==3 or not resp.headers.get('location'): raise HTTPException(400,'Redirecionamentos inválidos')
                        url=urljoin(url,resp.headers['location']); continue
                    if resp.status_code!=200 or not resp.headers.get('content-type','').lower().startswith('image/'): raise HTTPException(400,'O link não aponta para uma imagem acessível')
                    limite=TAMANHO_MAXIMO_URL_MB*1024*1024
                    try: declarado=int(resp.headers.get('content-length','0'))
                    except ValueError: declarado=0
                    if declarado>limite: raise HTTPException(413,'Imagem maior que 8 MB')
                    dados=bytearray()
                    async for parte in resp.aiter_bytes():
                        dados.extend(parte)
                        if len(dados)>limite: raise HTTPException(413,'Imagem maior que 8 MB')
                    conteudo,_,tipo=await asyncio.to_thread(_comprimir_capa,bytes(dados),'','')
                    return Response(content=conteudo,media_type=tipo,headers={'X-Content-Type-Options':'nosniff'})
    except httpx.HTTPError as exc:
        raise HTTPException(400,'Não foi possível baixar a imagem') from exc
