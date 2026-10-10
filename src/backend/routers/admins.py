from core import conta_publica
from core import consultar_completo, consultar_lote
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional as Opt

from database import supabase
from core import get_admin, get_admin_ou_professor, hash_password, normalize_email, parse_status, invalidate_token_version_cache
from schemas import AdminCreate, AdminUpdate, BatchIds, BatchStatus

router = APIRouter()


def _tema_para_app(valor_db: str | None) -> str:
    """Converte o valor do enum `preferenciatema` (CLARO/ESCURO) para o
    formato usado no resto do app (Claro/Escuro)."""
    return (valor_db or "CLARO").capitalize()


def _tema_para_db(valor_app: str) -> str:
    """Converte Claro/Escuro (formato usado no app) para o enum do banco."""
    return valor_app.upper()


def _proteger_desativacao(ids: list[int], admin_atual: dict) -> None:
    """Impede que a operação deixe o sistema sem um administrador ativo."""
    ids = list(dict.fromkeys(ids))
    if not ids:
        return

    atuais = (
        consultar_lote(lambda ids_lote: supabase.table('Administrador').select('idAdmin, admEmail, admStatus, admProfessor').in_('idAdmin', ids_lote), 'Administrador', ids)
        .data
        or []
    )
    ids_ativos_afetados = {
        a["idAdmin"] for a in atuais if parse_status(a.get("admStatus")) and not a.get("admProfessor")
    }
    if admin_atual.get("sub") in {a.get("admEmail") for a in atuais}:
        raise HTTPException(status_code=400, detail="Não é possível desativar a própria conta")

    ativos = (
        supabase.table("Administrador")
        .select("idAdmin", count="exact", head=True)
        .eq("admStatus", True).eq("admProfessor", False)
        .execute()
    )
    total_ativos = getattr(ativos, "count", None)
    if total_ativos is None:
        total_ativos = len(ativos.data or [])
    if int(total_ativos) - len(ids_ativos_afetados) < 1:
        raise HTTPException(status_code=400, detail="Não é possível desativar o último administrador ativo")


def _proteger_desativacao_individual(id_admin: int, admin_atual: dict) -> None:
    _proteger_desativacao([id_admin], admin_atual)


@router.get("/admins")
def listar_admins(admin=Depends(get_admin)):
    resp = consultar_completo(lambda: supabase.table('Administrador').select('*').order('admNome'), 'Administrador')
    return [conta_publica(c) for c in (resp.data or [])]


@router.post("/admins")
def criar_admin(data: AdminCreate, admin=Depends(get_admin)):
    email = normalize_email(data.email)

    email_existe_usuario = consultar_completo(lambda: supabase.table('Usuario').select('*').eq('usuEmail', email), 'Usuario')
    if email_existe_usuario.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado como usuário")

    exist = consultar_completo(lambda: supabase.table('Administrador').select('*').eq('admEmail', email), 'Administrador')
    if exist.data:
        raise HTTPException(status_code=400, detail="Admin já existe")

    hash_senha = hash_password(data.senha)
    criado = supabase.table("Administrador").insert({
        "admNome": data.nome,
        "admEmail": email,
        "admSenha": hash_senha,
        "admStatus": parse_status(data.status),
        "admProfessor": bool(data.professor)
    }).execute()
    return conta_publica(criado.data[0])


def _increment_admin_token_version(id_conta: int) -> int:
    rows = supabase.table("Administrador").select("admTokenVersion").eq("idAdmin", id_conta).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Conta não encontrada")
    return int(rows[0]["admTokenVersion"]) + 1


@router.post("/admins/batch/excluir")
def excluir_admins_lote(data: BatchIds, admin=Depends(get_admin)):
    if not data.ids:
        raise HTTPException(status_code=400, detail="Nenhum ID informado")
    _proteger_desativacao(data.ids, admin)
    supabase.table("Administrador").update({"admStatus": False}).in_("idAdmin", data.ids).execute()
    return {"message": f"{len(data.ids)} admin(s) desativado(s) com sucesso"}


@router.post("/admins/batch/status")
def atualizar_status_admins_lote(data: BatchStatus, admin=Depends(get_admin)):
    if not data.ids:
        raise HTTPException(status_code=400, detail="Nenhum ID informado")
    if not data.status:
        _proteger_desativacao(data.ids, admin)
    supabase.table("Administrador").update({"admStatus": data.status}).in_("idAdmin", data.ids).execute()
    return {"message": f"{len(data.ids)} admin(s) atualizados com sucesso"}


@router.put("/admins/{idAdmin}")
def atualizar_admin(idAdmin: int, data: AdminUpdate, admin=Depends(get_admin)):
    resp = consultar_completo(lambda: supabase.table('Administrador').select('*').eq('idAdmin', idAdmin), 'Administrador')
    if not resp.data:
        raise HTTPException(status_code=404, detail="Admin não encontrado")

    payload = {}
    increment_token = False
    if data.nome is not None:
        payload["admNome"] = data.nome
    if data.email is not None:
        increment_token = True
        payload["admEmail"] = normalize_email(data.email)
    if data.senha is not None:
        payload["admSenha"] = hash_password(data.senha)
        increment_token = True
    if data.status is not None:
        novo_status = parse_status(data.status)
        if not novo_status:
            _proteger_desativacao_individual(idAdmin, admin)
        payload["admStatus"] = novo_status
        increment_token = True
    if data.professor is not None:
        increment_token = True
        if data.professor:
            _proteger_desativacao_individual(idAdmin, admin)
        payload["admProfessor"] = bool(data.professor)

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    if increment_token:
        new_version = _increment_admin_token_version(idAdmin)
        payload["admTokenVersion"] = new_version

    resp = supabase.table("Administrador").update(payload).eq("idAdmin", idAdmin).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Admin não encontrado")
    return conta_publica(resp.data[0])

@router.delete("/admins/{idAdmin}")
def deletar_admin(idAdmin: int, admin=Depends(get_admin)):
    _proteger_desativacao_individual(idAdmin, admin)
    _increment_admin_token_version(idAdmin)
    supabase.table("Administrador").update({"admStatus": False}).eq("idAdmin", idAdmin).execute()
    return {"message": "Admin desativado com sucesso"}


# ── PERFIL DO PRÓPRIO ADMIN ───────────────────────────────────────


class AdminPerfilUpdate(BaseModel):
    tema: Opt[str] = None


@router.get("/admin/me")
def get_perfil_admin(admin=Depends(get_admin_ou_professor)):
    resp = consultar_completo(lambda: supabase.table('Administrador').select('*').eq('admEmail', admin['sub']), 'Administrador')
    if not resp.data:
        raise HTTPException(status_code=404, detail="Admin não encontrado")
    a = resp.data[0]
    return {
        "idAdmin": a.get("idAdmin"),
        "nome":    a.get("admNome"),
        "email":   a.get("admEmail"),
        "tema":    _tema_para_app(a.get("admTema")),
        "professor": bool(a.get("admProfessor")),
    }


@router.patch("/admin/me")
def atualizar_perfil_admin(data: AdminPerfilUpdate, admin=Depends(get_admin_ou_professor)):
    resp = consultar_completo(lambda: supabase.table('Administrador').select('*').eq('admEmail', admin['sub']), 'Administrador')
    if not resp.data:
        raise HTTPException(status_code=404, detail="Admin não encontrado")
    a = resp.data[0]

    payload = {}

    # Tema (aparência) — só aceita os dois valores válidos; convertido pro
    # formato do enum `preferenciatema` no banco (CLARO/ESCURO). Cada admin
    # guarda sua própria preferência, sem afetar os demais usuários.
    if data.tema is not None:
        if data.tema not in ("Claro", "Escuro"):
            raise HTTPException(status_code=400, detail="Tema inválido. Use 'Claro' ou 'Escuro'.")
        payload["admTema"] = _tema_para_db(data.tema)

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    atual = supabase.table("Administrador").update(payload).eq("idAdmin", a["idAdmin"]).execute()
    if not atual.data:
        raise HTTPException(status_code=500, detail="Falha ao atualizar perfil")

    updated = atual.data[0]
    return {
        "idAdmin": updated.get("idAdmin"),
        "nome":    updated.get("admNome"),
        "email":   updated.get("admEmail"),
        "tema":    _tema_para_app(updated.get("admTema")),
        "professor": bool(updated.get("admProfessor")),
    }
