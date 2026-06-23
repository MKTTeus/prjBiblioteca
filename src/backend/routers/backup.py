import json
import os
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse

from core import get_admin
from database import supabase

router = APIRouter()

CRON_SECRET = os.getenv("CRON_SECRET")
BACKUP_BUCKET = "backups"

TABELAS = [
    "Usuario", "Administrador", "Livro", "Exemplar",
    "Autor", "Editora", "Categoria", "Genero",
    "LivroAutor", "LivroCategoria", "LivroGenero",
    "Movimentacao", "MovimentacaoExemplar", "Configuracoes",
]


def verificar_cron(authorization: str = Header(None)):
    if not CRON_SECRET or authorization != f"Bearer {CRON_SECRET}":
        raise HTTPException(status_code=401, detail="Acesso não autorizado")


def _gerar_dados_backup() -> dict:
    dados = {}
    for tabela in TABELAS:
        try:
            resp = supabase.table(tabela).select("*").execute()
            dados[tabela] = resp.data or []
        except Exception as e:
            dados[tabela] = {"erro": str(e)}

    return {
        "gerado_em": datetime.utcnow().isoformat(),
        "tabelas": TABELAS,
        "dados": dados,
    }


def _salvar_no_storage(payload: dict) -> str:
    """Serializa o payload como JSON e faz upload no Supabase Storage.
    Retorna o nome do arquivo salvo."""
    nome_arquivo = f"backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    conteudo = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")

    supabase.storage.from_(BACKUP_BUCKET).upload(
        path=nome_arquivo,
        file=conteudo,
        file_options={"content-type": "application/json"},
    )

    return nome_arquivo


# ── Cron: dispara diariamente às 16h ─────────────────────────────────────────

@router.get("/cron/backup-diario")
def cron_backup_diario(_=Depends(verificar_cron)):
    """Chamado automaticamente pelo Vercel Cron às 16h todos os dias."""
    try:
        payload = _gerar_dados_backup()
        nome_arquivo = _salvar_no_storage(payload)
        return {"ok": True, "arquivo": nome_arquivo, "gerado_em": payload["gerado_em"]}
    except Exception as e:
        print("Erro no backup diário:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao salvar backup: {e}")


# ── Admin: salvar backup manualmente ─────────────────────────────────────────

@router.post("/backup/salvar")
def backup_salvar(admin=Depends(get_admin)):
    """Gera o backup agora e salva no Supabase Storage."""
    try:
        payload = _gerar_dados_backup()
        nome_arquivo = _salvar_no_storage(payload)
        return {"ok": True, "arquivo": nome_arquivo, "gerado_em": payload["gerado_em"]}
    except Exception as e:
        print("Erro ao salvar backup:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao salvar backup: {e}")


# ── Admin: listar backups disponíveis ────────────────────────────────────────

@router.get("/backup/listar")
def backup_listar(admin=Depends(get_admin)):
    """Lista todos os arquivos de backup salvos no Supabase Storage."""
    try:
        arquivos = supabase.storage.from_(BACKUP_BUCKET).list(
            options={"sortBy": {"column": "created_at", "order": "desc"}}
        )
        resultado = []
        for arq in (arquivos or []):
            resultado.append({
                "nome": arq.get("name"),
                "tamanho": arq.get("metadata", {}).get("size"),
                "criado_em": arq.get("created_at"),
                "atualizado_em": arq.get("updated_at"),
            })
        return {"backups": resultado}
    except Exception as e:
        print("Erro ao listar backups:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao listar backups: {e}")


# ── Admin: gerar URL assinada para download ───────────────────────────────────

@router.get("/backup/download/{nome_arquivo}")
def backup_download_url(nome_arquivo: str, admin=Depends(get_admin)):
    """Gera uma URL assinada (válida por 60 s) para download direto do arquivo."""
    try:
        resp = supabase.storage.from_(BACKUP_BUCKET).create_signed_url(
            path=nome_arquivo, expires_in=60
        )
        url = resp.get("signedURL") or resp.get("signed_url") or (resp if isinstance(resp, str) else None)
        if not url:
            raise HTTPException(status_code=404, detail="Arquivo não encontrado ou URL inválida")
        return {"url": url}
    except HTTPException:
        raise
    except Exception as e:
        print("Erro ao gerar URL de download:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao gerar URL: {e}")


# ── Admin: excluir backup ─────────────────────────────────────────────────────

@router.delete("/backup/{nome_arquivo}")
def backup_excluir(nome_arquivo: str, admin=Depends(get_admin)):
    """Remove um arquivo de backup do Supabase Storage."""
    try:
        supabase.storage.from_(BACKUP_BUCKET).remove([nome_arquivo])
        return {"ok": True, "removido": nome_arquivo}
    except Exception as e:
        print("Erro ao excluir backup:", e)
        raise HTTPException(status_code=500, detail=f"Erro ao excluir: {e}")


# ── Legado: download direto (mantido para compatibilidade) ────────────────────

@router.get("/backup/completo")
def backup_completo(admin=Depends(get_admin)):
    dados = _gerar_dados_backup()
    return JSONResponse(
        content=dados,
        headers={
            "Content-Disposition": (
                f'attachment; filename="backup_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json"'
            )
        },
    )