import gzip
import hashlib
import json
import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from core import buscar_todos, get_admin, utc_now, verify_password
from database import supabase

router = APIRouter()

CRON_SECRET = os.getenv("CRON_SECRET")
BACKUP_BUCKET = "backups"
MAX_BACKUPS = 7
PREFIXO_BACKUP_SEGURANCA = "seguranca_pre_restauracao"


def _ler_horas_retencao_seguranca() -> int:
    """Retorna a janela de recuperação em horas.

    O valor pode ser configurado com BACKUP_SEGURANCA_RETENCAO_HORAS; quando
    ausente ou inválido, mantém backups de segurança por 48 horas.
    """
    try:
        return max(1, int(os.getenv("BACKUP_SEGURANCA_RETENCAO_HORAS", "48")))
    except ValueError:
        return 48


BACKUP_SEGURANCA_RETENCAO_HORAS = _ler_horas_retencao_seguranca()

# Versão do formato do payload de backup. Incrementar sempre que a lista de
# tabelas ou a estrutura do payload mudar de forma incompatível com
# restaurações antigas — /backup/restaurar usa isso para recusar backups de
# um formato mais novo do que o que este código sabe restaurar.
BACKUP_VERSAO = 2

# Tabelas de dados que TÊM que estar presentes e íntegras em todo backup.
# Revisada em conjunto com supabase/migrations/ — se uma nova tabela de
# dados for criada, ela precisa entrar aqui (e na função SQL
# restaurar_backup_completo) para não ficar de fora do backup silenciosamente.
TABELAS = [
    "Usuario", "Administrador", "Livro", "Exemplar",
    "Autor", "Editora", "Categoria", "Genero",
    "LivroAutor", "LivroCategoria", "LivroGenero",
    "Movimentacao", "MovimentacaoExemplar", "Configuracoes",
    "FichaCatalografica",
]

# RedefinicaoSenha: decisão — INCLUIR no backup.
# Motivo: a tabela guarda apenas hash de token (nunca o token em claro) e
# timestamps; já hoje o backup inclui Usuario.usuSenha e Administrador.admSenha
# (hashes de senha), então excluir só o hash de token de redefinição não
# traria proteção adicional relevante, e incluir mantém o comportamento de
# "restauração exata" também para o fluxo de esqueci-minha-senha. O valor do
# token nunca é exposto na interface (/backup/listar só soma contagens).
# Tokens expirados/usados são restaurados como estavam no momento do backup —
# eles não concedem acesso por si só (a validação de expiração acontece em
# tempo de uso, no endpoint /redefinir-senha/validar).
INCLUIR_REDEFINICAO_SENHA = True
if INCLUIR_REDEFINICAO_SENHA:
    TABELAS = TABELAS + ["RedefinicaoSenha"]


class BackupIncompletoError(Exception):
    """Levantada quando qualquer tabela obrigatória falha ao ser lida.
    Um backup parcial nunca deve ser tratado como válido nem enviado ao
    Storage."""


def verificar_cron(
    authorization: str = Header(None),
    x_vercel_cron_signature: str = Header(None),
):
    vercel_ok = CRON_SECRET and x_vercel_cron_signature == CRON_SECRET
    manual_ok = CRON_SECRET and authorization == f"Bearer {CRON_SECRET}"

    if not vercel_ok and not manual_ok:
        raise HTTPException(status_code=401, detail="Acesso não autorizado")


def _gerar_dados_backup() -> dict:
    """Lê todas as TABELAS por completo (com paginação, via buscar_todos —
    um select sem paginação é truncado silenciosamente pelo limite de Max
    Rows do Supabase). Se qualquer tabela obrigatória falhar, interrompe
    imediatamente: nunca produz um backup parcial."""
    dados = {}
    for tabela in TABELAS:
        try:
            dados[tabela] = buscar_todos(lambda t=tabela: supabase.table(t).select("*"))
        except Exception as e:
            print(f"Erro ao ler tabela '{tabela}' para backup:", e)
            raise BackupIncompletoError(
                f"Falha ao ler a tabela '{tabela}': {e}"
            ) from e

    contagem_registros = {t: len(v) for t, v in dados.items()}
    hash_dados = hashlib.sha256(
        json.dumps(dados, ensure_ascii=False, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()

    return {
        "versao_backup": BACKUP_VERSAO,
        "identificador": str(uuid.uuid4()),
        "gerado_em": utc_now().isoformat(),
        "tabelas": TABELAS,
        "contagem_registros": contagem_registros,
        "hash_dados": hash_dados,
        "dados": dados,
    }


def _salvar_no_storage(payload: dict, prefixo: str = "backup") -> str:
    """Serializa o payload como JSON, comprime com gzip e faz upload no
    Supabase Storage. Retorna o nome do arquivo salvo."""
    nome_arquivo = f"{prefixo}_{utc_now().strftime('%Y%m%d_%H%M%S')}.json.gz"
    conteudo_json = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    conteudo = gzip.compress(conteudo_json)

    supabase.storage.from_(BACKUP_BUCKET).upload(
        path=nome_arquivo,
        file=conteudo,
        file_options={"content-type": "application/gzip"},
    )

    return nome_arquivo


def _conteudo_backup_descompactado(conteudo: bytes, nome_arquivo: str) -> bytes:
    """Descompacta backups novos (.json.gz) e mantém compatibilidade com
    backups antigos (.json)."""
    if nome_arquivo.lower().endswith(".gz"):
        return gzip.decompress(conteudo)
    return conteudo


def _validar_backup(payload: dict) -> None:
    """Valida a integridade estrutural de um backup antes de permitir que
    ele seja usado em uma restauração destrutiva. Levanta ValueError com
    uma mensagem clara em caso de qualquer problema."""
    if not isinstance(payload, dict):
        raise ValueError("Arquivo de backup inválido: formato inesperado")

    dados = payload.get("dados")
    if not isinstance(dados, dict):
        raise ValueError("Arquivo de backup inválido: seção 'dados' ausente ou corrompida")

    versao = payload.get("versao_backup", 1)  # backups antigos não tinham este campo
    if not isinstance(versao, int) or versao > BACKUP_VERSAO:
        raise ValueError(
            f"Backup em uma versão não suportada (versao_backup={versao!r}); "
            f"este servidor sabe restaurar até a versão {BACKUP_VERSAO}"
        )

    for tabela in TABELAS:
        registros = dados.get(tabela)
        if registros is None:
            # Compatibilidade com backups antigos: uma tabela adicionada
            # depois (ex.: FichaCatalografica, RedefinicaoSenha) pode não
            # existir em um backup feito antes de ela existir — a RPC de
            # restauração trata isso preservando os dados atuais dessa
            # tabela. Só é erro se a tabela é obrigatória E o backup diz
            # ser da versão atual (então deveria tê-la).
            if versao >= BACKUP_VERSAO and tabela not in ("RedefinicaoSenha",):
                raise ValueError(f"Backup incompleto: tabela obrigatória '{tabela}' ausente")
            continue
        if not isinstance(registros, list):
            # Cobre também o formato antigo com falha (dados[tabela] = {"erro": ...}),
            # que nunca deve ser aceito como backup válido.
            raise ValueError(f"Backup corrompido ou incompleto: tabela '{tabela}' não é uma lista de registros")
        for registro in registros[:1]:
            if not isinstance(registro, dict):
                raise ValueError(f"Backup corrompido: registros de '{tabela}' com estrutura inválida")


def _rotacionar_backups() -> None:
    """Mantém somente os MAX_BACKUPS backups normais mais recentes.

    Backups de segurança criados antes de restaurações seguem uma política
    separada, por tempo, para garantir uma janela de recuperação previsível.
    """
    arquivos = supabase.storage.from_(BACKUP_BUCKET).list()
    backups = []

    for arq in (arquivos or []):
        nome = arq.get("name", "")
        if not nome or nome.startswith("."):
            continue
        if (
            nome.startswith(PREFIXO_BACKUP_SEGURANCA)
            or not (nome.lower().endswith(".json") or nome.lower().endswith(".json.gz"))
        ):
            continue

        # O Storage normalmente fornece created_at; o nome também contém a
        # data/hora do backup e serve como fallback determinístico.
        criado_em = arq.get("created_at") or arq.get("updated_at") or ""
        backups.append((criado_em, nome))

    backups.sort(key=lambda item: (item[0], item[1]), reverse=True)

    for _, nome in backups[MAX_BACKUPS:]:
        try:
            supabase.storage.from_(BACKUP_BUCKET).remove([nome])
        except Exception as e:
            # A rotação não deve invalidar o backup recém-criado.
            print(f"Erro ao remover backup antigo {nome}: {e}")


def _data_backup_seguranca(arquivo: dict) -> datetime | None:
    """Lê a data do Storage, usando o nome do arquivo somente como fallback."""
    data = arquivo.get("created_at") or arquivo.get("updated_at")
    if data:
        try:
            return datetime.fromisoformat(data.replace("Z", "+00:00")).astimezone(timezone.utc)
        except (TypeError, ValueError):
            pass

    nome = arquivo.get("name", "")
    try:
        trecho = nome.removeprefix(f"{PREFIXO_BACKUP_SEGURANCA}_").split(".", 1)[0]
        return datetime.strptime(trecho, "%Y%m%d_%H%M%S").replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def _expirar_backups_seguranca() -> None:
    """Remove backups de recuperação fora da janela configurada.

    Esta limpeza roda depois de qualquer criação de backup. Arquivos sem uma
    data verificável são preservados por segurança e registrados para análise.
    """
    limite = datetime.now(timezone.utc) - timedelta(hours=BACKUP_SEGURANCA_RETENCAO_HORAS)
    try:
        arquivos = supabase.storage.from_(BACKUP_BUCKET).list()
    except Exception as e:
        print("Erro ao listar backups de segurança para expiração:", e)
        return

    for arquivo in arquivos or []:
        nome = arquivo.get("name", "")
        if not nome.startswith(f"{PREFIXO_BACKUP_SEGURANCA}_"):
            continue
        criado_em = _data_backup_seguranca(arquivo)
        if criado_em is None:
            print(f"Backup de segurança sem data verificável, preservado: {nome}")
            continue
        if criado_em < limite:
            try:
                supabase.storage.from_(BACKUP_BUCKET).remove([nome])
            except Exception as e:
                print(f"Erro ao expirar backup de segurança {nome}: {e}")


def _aplicar_retencao_backups() -> None:
    _rotacionar_backups()
    _expirar_backups_seguranca()


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
        _aplicar_retencao_backups()
        return {"ok": True, "arquivo": nome_arquivo, "gerado_em": payload["gerado_em"]}
    except BackupIncompletoError as e:
        print("Backup diário abortado (dados incompletos):", e)
        raise HTTPException(status_code=500, detail=f"Backup não gerado: {e}")
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
        _aplicar_retencao_backups()
        return {"ok": True, "arquivo": nome_arquivo, "gerado_em": payload["gerado_em"]}
    except BackupIncompletoError as e:
        print("Backup manual abortado (dados incompletos):", e)
        raise HTTPException(status_code=500, detail=f"Backup não gerado: {e}")
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
            versao_backup = None
            try:
                conteudo = supabase.storage.from_(BACKUP_BUCKET).download(nome)
                conteudo = _conteudo_backup_descompactado(conteudo, nome)
                dados_payload = json.loads(conteudo)
                versao_backup = dados_payload.get("versao_backup")
                tabelas_dados = dados_payload.get("dados", {})
                contagem_tabelas = {
                    t: len(v) if isinstance(v, list) else 0
                    for t, v in tabelas_dados.items()
                }
                total_registros = sum(contagem_tabelas.values())
            except Exception:
                pass

            resultado.append({
                "nome": nome,
                "tipo": (
                    "recuperacao"
                    if nome.startswith(f"{PREFIXO_BACKUP_SEGURANCA}_")
                    else "normal"
                ),
                "expira_em": (
                    (
                        _data_backup_seguranca(arq)
                        + timedelta(hours=BACKUP_SEGURANCA_RETENCAO_HORAS)
                    ).isoformat()
                    if nome.startswith(f"{PREFIXO_BACKUP_SEGURANCA}_")
                    and _data_backup_seguranca(arq)
                    else None
                ),
                "tamanho": arq.get("metadata", {}).get("size"),
                "criado_em": arq.get("created_at"),
                "atualizado_em": arq.get("updated_at"),
                "versao_backup": versao_backup,
                "total_registros": total_registros,
                "contagem_tabelas": contagem_tabelas,
            })
        return {
            "backups": resultado,
            "retencao_seguranca_horas": BACKUP_SEGURANCA_RETENCAO_HORAS,
        }
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
    try:
        dados = _gerar_dados_backup()
    except BackupIncompletoError as e:
        raise HTTPException(status_code=500, detail=f"Backup não gerado: {e}")
    return JSONResponse(
        content=dados,
        headers={
            "Content-Disposition": (
                f'attachment; filename="backup_{utc_now().strftime("%Y%m%d_%H%M%S")}.json"'
            )
        },
    )


# ── Admin: restaurar backup ───────────────────────────────────────────────────

class RestaurarRequest(BaseModel):
    nome_arquivo: str
    senha: str


@router.post("/backup/restaurar")
def backup_restaurar(body: RestaurarRequest, admin=Depends(get_admin)):
    """Restaura o banco para o estado exato de um backup: registros criados
    depois do backup são removidos. Fluxo:
      1) valida a senha do admin;
      2) baixa e valida estruturalmente o backup escolhido;
      3) cria um backup de segurança do estado ATUAL (aborta se isso falhar —
         nunca restaura sem uma via de recuperação);
      4) chama a função SQL restaurar_backup_completo em uma única RPC, que
         apaga e reinsere tudo dentro de uma transação real do Postgres —
         se qualquer parte falhar, o banco inteiro volta ao estado anterior
         automaticamente (ROLLBACK implícito da função)."""

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

    # 2. Baixar e validar o arquivo do Storage
    try:
        conteudo = supabase.storage.from_(BACKUP_BUCKET).download(body.nome_arquivo)
        conteudo = _conteudo_backup_descompactado(conteudo, body.nome_arquivo)
        payload = json.loads(conteudo)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Arquivo não encontrado: {e}")

    try:
        _validar_backup(payload)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Backup inválido, restauração não iniciada: {e}")

    # 3. Backup de segurança do estado atual — obrigatório antes de qualquer
    #    operação destrutiva. Se falhar, a restauração é abortada.
    try:
        payload_seguranca = _gerar_dados_backup()
        nome_seguranca = _salvar_no_storage(payload_seguranca, prefixo=PREFIXO_BACKUP_SEGURANCA)
        _aplicar_retencao_backups()
    except Exception as e:
        print("Restauração abortada: falha ao criar backup de segurança:", e)
        raise HTTPException(
            status_code=500,
            detail=(
                "Restauração abortada: não foi possível criar um backup de segurança "
                f"do estado atual antes de prosseguir ({e}). Nenhum dado foi alterado."
            ),
        )

    # 4. Restauração exata, atômica, via RPC única
    try:
        resp = supabase.rpc(
            "restaurar_backup_completo", {"dados": payload.get("dados", {})}
        ).execute()
        restauradas = resp.data or {}
    except Exception as e:
        print("Erro na restauração (revertida automaticamente pelo Postgres):", e)
        return JSONResponse(status_code=500, content={
            "ok": False,
            "arquivo": body.nome_arquivo,
            "erro": str(e),
            "rollback": True,
            "backup_seguranca": nome_seguranca,
        })

    return {
        "ok": True,
        "arquivo": body.nome_arquivo,
        "restauradas": restauradas,
        "gerado_em": payload.get("gerado_em"),
        "backup_seguranca": nome_seguranca,
    }
