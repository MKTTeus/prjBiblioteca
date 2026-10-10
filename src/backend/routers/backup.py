import base64
import io
import re
from urllib.parse import unquote
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
from rpc import executar_rpc
import hmac

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
BACKUP_VERSAO = 3
TABELAS = ['Administrador','Usuario','Autor','Editora','Categoria','Genero','Livro','Exemplar',
    'LivroAutor','LivroCategoria','LivroGenero','Movimentacao','MovimentacaoExemplar','Configuracoes',
    'FichaCatalografica','ResultadoAnoLetivo','TomboContador','EmailOutbox','RedefinicaoSenha']


class BackupIncompletoError(Exception):
    """Levantada quando qualquer tabela obrigatória falha ao ser lida.
    Um backup parcial nunca deve ser tratado como válido nem enviado ao
    Storage."""


def verificar_cron(authorization: str = Header(None)):
    if not CRON_SECRET or not hmac.compare_digest(authorization or '', f'Bearer {CRON_SECRET}'):
        raise HTTPException(401,'Acesso não autorizado')


def _gerar_dados_backup() -> dict:
    dados = executar_rpc('gerar_snapshot_backup', {})
    if not isinstance(dados, dict) or set(dados) != set(TABELAS):
        raise BackupIncompletoError('Snapshot incompleto')
    arquivos=_capturar_capas(dados)
    return {'arquivos':arquivos, 'versao_backup':BACKUP_VERSAO, 'identificador':str(uuid.uuid4()),
        'gerado_em':utc_now().isoformat(), 'tabelas':TABELAS,
        'contagem_registros':{t:len(dados[t]) for t in TABELAS},
        'hash_dados':hashlib.sha256(json.dumps(dados,ensure_ascii=False,sort_keys=True,default=str).encode()).hexdigest(),
        'dados':dados}


def _capturar_capas(dados):
    prefixo=os.getenv('SUPABASE_URL','').rstrip('/')+'/storage/v1/object/public/capas/'
    arquivos={}
    for livro in dados.get('Livro',[]):
        url=livro.get('livCapaURL') or ''
        if not url.startswith(prefixo): continue
        caminho=unquote(url[len(prefixo):].split('?',1)[0])
        if caminho in arquivos: continue
        conteudo=supabase.storage.from_('capas').download(caminho)
        if len(conteudo)>8*1024*1024: raise BackupIncompletoError('Capa maior que o limite de backup')
        arquivos[caminho]={'base64':base64.b64encode(conteudo).decode(),'sha256':hashlib.sha256(conteudo).hexdigest(),'url':url}
    return arquivos


def _restaurar_capas(payload):
    # Arquivos imutáveis novos: uma falha de banco não altera capas em uso.
    dados=payload['dados']
    prefixo=os.getenv('SUPABASE_URL','').rstrip('/')+'/storage/v1/object/public/capas/'
    for arquivo in payload['arquivos'].values():
        conteudo=base64.b64decode(arquivo['base64'],validate=True)
        caminho='restaurados/'+arquivo['sha256']
        try:
            existente=supabase.storage.from_('capas').download(caminho)
            if hashlib.sha256(existente).hexdigest()!=arquivo['sha256']: raise ValueError('Capa restaurada divergente')
        except Exception:
            from routers.capas import _comprimir_capa
            limpo,_,tipo=_comprimir_capa(conteudo,'','')
            # Mantém os bytes do backup; validação rejeita arquivos que não são imagens.
            supabase.storage.from_('capas').upload(caminho,conteudo,file_options={'content-type':Image_mime(conteudo),'upsert':'false'})
        for livro in dados.get('Livro',[]):
            if livro.get('livCapaURL')==arquivo['url']:
                livro['livCapaURL']=prefixo+caminho
                livro['livCapaCaminho']=caminho
    return dados


def Image_mime(conteudo):
    from PIL import Image
    with Image.open(io.BytesIO(conteudo)) as im: return Image.MIME[im.format]


def _validar_nome(nome):
    if not re.fullmatch(r'(backup|seguranca_pre_restauracao)_[0-9_]+(?:[a-f0-9]{32})?\.json(?:\.gz)?',nome):
        raise HTTPException(422,'Nome de backup inválido')


def _listar_storage():
    arquivos=[]; offset=0
    while True:
        lote=supabase.storage.from_(BACKUP_BUCKET).list(options={'limit':100,'offset':offset,'sortBy':{'column':'name','order':'asc'}})
        arquivos.extend(lote or [])
        if len(lote or [])<100: return arquivos
        offset+=100


def _salvar_no_storage(payload: dict, prefixo: str = "backup") -> str:
    """Serializa o payload como JSON, comprime com gzip e faz upload no
    Supabase Storage. Retorna o nome do arquivo salvo."""
    nome_arquivo = f"{prefixo}_{utc_now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex}.json.gz"
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
        with gzip.GzipFile(fileobj=io.BytesIO(conteudo)) as arquivo:
            descompactado=arquivo.read(100*1024*1024+1)
        if len(descompactado)>100*1024*1024: raise ValueError('Backup maior que 100 MB')
        return descompactado
    return conteudo


def _validar_backup(payload: dict) -> None:
    if not isinstance(payload,dict) or payload.get('versao_backup') != BACKUP_VERSAO:
        raise ValueError('Formato incompatível: é obrigatório um backup completo na versão 3')
    arquivos=payload.get('arquivos')
    if not isinstance(arquivos,dict): raise ValueError('Seção de arquivos ausente')
    for arquivo in arquivos.values():
        try: conteudo=base64.b64decode(arquivo['base64'],validate=True)
        except Exception as exc: raise ValueError('Arquivo inválido no backup') from exc
        if len(conteudo)>8*1024*1024 or hashlib.sha256(conteudo).hexdigest()!=arquivo.get('sha256'): raise ValueError('Arquivo corrompido no backup')
    dados=payload.get('dados')
    if not isinstance(dados,dict) or set(dados) != set(TABELAS): raise ValueError('Tabelas ausentes ou desconhecidas')
    for t in TABELAS:
        if not isinstance(dados[t],list) or any(not isinstance(r,dict) for r in dados[t]): raise ValueError(f'Registros inválidos: {t}')
        if payload.get('contagem_registros',{}).get(t) != len(dados[t]): raise ValueError(f'Contagem divergente: {t}')
    digest=hashlib.sha256(json.dumps(dados,ensure_ascii=False,sort_keys=True,default=str).encode()).hexdigest()
    if not hmac.compare_digest(digest,str(payload.get('hash_dados',''))): raise ValueError('Hash de integridade divergente')


def _rotacionar_backups() -> None:
    """Mantém somente os MAX_BACKUPS backups normais mais recentes.

    Backups de segurança criados antes de restaurações seguem uma política
    separada, por tempo, para garantir uma janela de recuperação previsível.
    """
    arquivos = _listar_storage()
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
        trecho = "_".join(nome.removeprefix(f"{PREFIXO_BACKUP_SEGURANCA}_").split("_",2)[:2])
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
        arquivos = _listar_storage()
    except Exception as e:
        print("Erro ao listar backups de segurança para expiração:", 'falha de operacao')
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
        print("Backup diário abortado (dados incompletos):", 'falha de operacao')
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')
    except Exception as e:
        print("Erro no backup diário:", 'falha de operacao')
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')


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
        print("Backup manual abortado (dados incompletos):", 'falha de operacao')
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')
    except Exception as e:
        print("Erro ao salvar backup:", 'falha de operacao')
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')


# ── Admin: listar backups disponíveis ────────────────────────────────────────

@router.get("/backup/listar")
def backup_listar(admin=Depends(get_admin)):
    """Lista todos os arquivos de backup salvos no Supabase Storage."""
    try:
        arquivos = _listar_storage()
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
        print("Erro ao listar backups:", 'falha de operacao')
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')


# ── Admin: gerar URL assinada para download ───────────────────────────────────

@router.get("/backup/download/{nome_arquivo}")
def backup_download_url(nome_arquivo: str, admin=Depends(get_admin)):
    """Gera uma URL assinada (válida por 60 s) para download direto do arquivo."""
    try:
        _validar_nome(nome_arquivo)
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
        print("Erro ao gerar URL de download:", 'falha de operacao')
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')


# ── Admin: excluir backup ─────────────────────────────────────────────────────

@router.delete("/backup/{nome_arquivo}")
def backup_excluir(nome_arquivo: str, admin=Depends(get_admin)):
    """Remove um arquivo de backup do Supabase Storage."""
    try:
        _validar_nome(nome_arquivo)
        supabase.storage.from_(BACKUP_BUCKET).remove([nome_arquivo])
        return {"ok": True, "removido": nome_arquivo}
    except Exception as e:
        print("Erro ao excluir backup:", 'falha de operacao')
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')


# ── Legado: download direto (mantido para compatibilidade) ────────────────────

@router.get("/backup/completo")
def backup_completo(admin=Depends(get_admin)):
    try:
        dados = _gerar_dados_backup()
    except BackupIncompletoError as e:
        raise HTTPException(status_code=500, detail='Não foi possível concluir a operação')
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

    _validar_nome(body.nome_arquivo)
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
        raise HTTPException(status_code=403, detail="Senha incorreta")

    # 2. Baixar e validar o arquivo do Storage
    try:
        conteudo = supabase.storage.from_(BACKUP_BUCKET).download(body.nome_arquivo)
        conteudo = _conteudo_backup_descompactado(conteudo, body.nome_arquivo)
        payload = json.loads(conteudo)
    except Exception as e:
        raise HTTPException(status_code=404, detail='Não foi possível concluir a operação')

    try:
        _validar_backup(payload)
    except ValueError as e:
        raise HTTPException(status_code=422, detail='Não foi possível concluir a operação')

    # 3. Backup de segurança do estado atual — obrigatório antes de qualquer
    #    operação destrutiva. Se falhar, a restauração é abortada.
    try:
        payload_seguranca = _gerar_dados_backup()
        nome_seguranca = _salvar_no_storage(payload_seguranca, prefixo=PREFIXO_BACKUP_SEGURANCA)
        _aplicar_retencao_backups()
    except Exception as e:
        print("Restauração abortada: falha ao criar backup de segurança:", 'falha de operacao')
        raise HTTPException(
            status_code=500,
            detail=(
                'Não foi possível concluir a operação'
            ),
        )

    # Capas são adicionadas como novos objetos antes da transação, sem sobrescrever objetos atuais.
    try: dados_restauracao=_restaurar_capas(payload)
    except Exception as exc: raise HTTPException(503,"Não foi possível recuperar as capas; banco não restaurado") from exc

    # 4. Restauração exata, atômica, via RPC única
    try:
        resp = supabase.rpc(
            "restaurar_backup_completo", {"dados": dados_restauracao}
        ).execute()
        restauradas = resp.data or {}
    except Exception as e:
        print("Erro na restauração (revertida automaticamente pelo Postgres):", 'falha de operacao')
        return JSONResponse(status_code=500, content={
            "ok": False,
            "arquivo": body.nome_arquivo,
            "erro": "Restauração recusada; os dados foram revertidos",
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
