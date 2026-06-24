import json
import os
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from core import get_admin, verify_password
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


def _extrair_signed_url(resp) -> str | None:
    """Extrai a URL assinada compatível com supabase-py v1 e v2."""
    if isinstance(resp, str):
        return resp
    if isinstance(resp, dict):
        return (
            resp.get("signedURL")
            or resp.get("signed_url")
            or resp.get("signedUrl")
        )
    # supabase-py v2 retorna objeto com atributo .signed_url
    return getattr(resp, "signed_url", None) or getattr(resp, "signedURL", None)


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
            # Filtra entradas de sistema (.emptyFolderPlaceholder etc.)
            nome = arq.get("name", "")
            if not nome or nome.startswith("."):
                continue

            # Tenta ler o JSON para contar registros por tabela
            total_registros = None
            contagem_tabelas = None
            try:
                conteudo = supabase.storage.from_(BACKUP_BUCKET).download(nome)
                dados = json.loads(conteudo)
                tabelas_dados = dados.get("dados", {})
                contagem_tabelas = {
                    t: len(v) if isinstance(v, list) else 0
                    for t, v in tabelas_dados.items()
                }
                total_registros = sum(contagem_tabelas.values())
            except Exception:
                pass

            resultado.append({
                "nome": nome,
                "tamanho": arq.get("metadata", {}).get("size"),
                "criado_em": arq.get("created_at"),
                "atualizado_em": arq.get("updated_at"),
                "total_registros": total_registros,
                "contagem_tabelas": contagem_tabelas,
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
        url = _extrair_signed_url(resp)
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


# ── Admin: restaurar backup ───────────────────────────────────────────────────

class RestaurarRequest(BaseModel):
    nome_arquivo: str
    senha: str


# Tabelas e suas PKs para upsert (na ordem correta de dependência)
TABELAS_PK = {
    "Usuario":              "idUsuario",
    "Administrador":        "idAdmin",
    "Livro":                "idLivro",
    "Exemplar":             "idExemplar",
    "Autor":                "idAutor",
    "Editora":              "idEditora",
    "Categoria":            "idCategoria",
    "Genero":               "idGenero",
    "LivroAutor":           "idLivroAutor",
    "LivroCategoria":       "idLivroCategoria",
    "LivroGenero":          "idLivroGenero",
    "Movimentacao":         "idMovimentacao",
    "MovimentacaoExemplar": "idMovimentacao,idExemplar",  # PK composta
    "Configuracoes":        "chave",
}

# Tabelas com GENERATED ALWAYS AS IDENTITY: não aceitam upsert com valor explícito.
# Estratégia: delete (ordem inversa para respeitar FK) + insert.
TABELAS_DELETE_INSERT = {"Movimentacao", "MovimentacaoExemplar"}

# Ordem de deleção invertida em relação à dependência (filho antes do pai)
ORDEM_DELETE = ["MovimentacaoExemplar", "Movimentacao"]


@router.post("/backup/restaurar")
def backup_restaurar(body: RestaurarRequest, admin=Depends(get_admin)):
    """Restaura todos os dados do sistema a partir de um arquivo de backup.
    Exige confirmação com a senha do administrador autenticado."""

    # 1. Verificar senha do admin
    email = admin.get("sub")
    adm_db = (
        supabase.table("Administrador")
        .select("admSenha")
        .eq("admEmail", email)
        .limit(1)
        .execute()
    )
    if not adm_db.data:
        raise HTTPException(status_code=403, detail="Administrador não encontrado")
    if not verify_password(body.senha, adm_db.data[0]["admSenha"]):
        raise HTTPException(status_code=401, detail="Senha incorreta")

    # 2. Baixar o arquivo do Storage
    try:
        conteudo = supabase.storage.from_(BACKUP_BUCKET).download(body.nome_arquivo)
        payload = json.loads(conteudo)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Arquivo não encontrado: {e}")

    dados = payload.get("dados", {})
    erros = []
    restauradas = {}

    # 3. Limpar tabelas com GENERATED ALWAYS AS IDENTITY na ordem inversa (respeita FK)
    for tabela in ORDEM_DELETE:
        pk_col = TABELAS_PK[tabela].split(",")[0]
        try:
            supabase.table(tabela).delete().neq(pk_col, -1).execute()
        except Exception as e:
            erros.append({"tabela": tabela, "erro": f"Erro ao limpar antes de inserir: {str(e)}"})

    # 4. Restaurar tabela a tabela
    for tabela, pk in TABELAS_PK.items():
        registros = dados.get(tabela)
        if not isinstance(registros, list) or not registros:
            restauradas[tabela] = 0
            continue
        try:
            if tabela in TABELAS_DELETE_INSERT:
                # Já foram limpas no passo 3; apenas insere
                supabase.table(tabela).insert(registros).execute()
            else:
                supabase.table(tabela).upsert(registros, on_conflict=pk).execute()
            restauradas[tabela] = len(registros)
        except Exception as e:
            erros.append({"tabela": tabela, "erro": str(e)})
            restauradas[tabela] = 0

    return {
        "ok": len(erros) == 0,
        "arquivo": body.nome_arquivo,
        "restauradas": restauradas,
        "erros": erros,
        "gerado_em": payload.get("gerado_em"),
    }