from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin, hash_password, normalize_email, parse_status
from schemas import AdminCreate, AdminUpdate

router = APIRouter()


@router.get("/admins")
def listar_admins(admin=Depends(get_admin)):
    resp = supabase.table("Administrador").select("*").order("admNome").execute()
    return resp.data or []


@router.post("/admins")
def criar_admin(data: AdminCreate, admin=Depends(get_admin)):
    email = normalize_email(data.email)

    email_existe_usuario = supabase.table("Usuario").select("*").eq("usuEmail", email).execute()
    if email_existe_usuario.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado como usuário")

    exist = supabase.table("Administrador").select("*").eq("admEmail", email).execute()
    if exist.data:
        raise HTTPException(status_code=400, detail="Admin já existe")

    hash_senha = hash_password(data.senha)
    criado = supabase.table("Administrador").insert({
        "admNome": data.nome,
        "admEmail": email,
        "admSenha": hash_senha,
        "admStatus": parse_status(data.status)
    }).execute()
    return criado.data[0]


@router.put("/admins/{idAdmin}")
def atualizar_admin(idAdmin: int, data: AdminUpdate, admin=Depends(get_admin)):
    resp = supabase.table("Administrador").select("*").eq("idAdmin", idAdmin).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Admin não encontrado")

    payload = {}
    if data.nome is not None:
        payload["admNome"] = data.nome
    if data.email is not None:
        payload["admEmail"] = normalize_email(data.email)
    if data.senha is not None:
        payload["admSenha"] = hash_password(data.senha)
    if data.status is not None:
        payload["admStatus"] = parse_status(data.status)

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    resp = supabase.table("Administrador").update(payload).eq("idAdmin", idAdmin).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Admin não encontrado")
    return resp.data[0]


@router.delete("/admins/{idAdmin}")
def deletar_admin(idAdmin: int, admin=Depends(get_admin)):
    # Soft delete: desativar admin
    supabase.table("Administrador").update({"admStatus": "Inativo"}).eq("idAdmin", idAdmin).execute()
    return {"message": "Admin desativado com sucesso"}
