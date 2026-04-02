from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from core import get_admin, hash_password, normalize_email, parse_status
from schemas import UsuarioCreate, UsuarioUpdate

router = APIRouter()


@router.get("/alunos")
def listar_alunos(admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("usuTipo", "Aluno").order("usuNome").execute()
    return resp.data or []


@router.post("/alunos")
def criar_aluno(data: UsuarioCreate, admin=Depends(get_admin)):
    email = normalize_email(data.email)

    email_existe_admin = supabase.table("Administrador").select("*").eq("admEmail", email).execute()
    if email_existe_admin.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado como administrador")

    exist = supabase.table("Usuario").select("*").eq("usuEmail", email).execute()
    if exist.data:
        raise HTTPException(status_code=400, detail="Aluno já existe")

    novo = {
        "usuNome": data.nome,
        "usuEmail": email,
        "usuSenha": hash_password(data.senha),
        "usuTelefone": data.telefone,
        "usuTelefoneResponsavel": data.telefoneResponsavel,
        "usuEndereco": data.endereco,
        "usuRA": data.ra,
        "usuTipo": "Aluno",
        "usuStatus": parse_status(data.status)
    }
    criado = supabase.table("Usuario").insert(novo).execute()
    return criado.data[0]


@router.put("/alunos/{idUsuario}")
def atualizar_aluno(idUsuario: int, data: UsuarioUpdate, admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("idUsuario", idUsuario).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    payload = {}
    if data.nome is not None:
        payload["usuNome"] = data.nome
    if data.email is not None:
        payload["usuEmail"] = normalize_email(data.email)
    if data.senha is not None:
        payload["usuSenha"] = hash_password(data.senha)
    if data.telefone is not None:
        payload["usuTelefone"] = data.telefone
    if data.telefoneResponsavel is not None:
        payload["usuTelefoneResponsavel"] = data.telefoneResponsavel
    if data.endereco is not None:
        payload["usuEndereco"] = data.endereco
    if data.ra is not None:
        payload["usuRA"] = data.ra
    if data.status is not None:
        payload["usuStatus"] = parse_status(data.status)

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    atual = supabase.table("Usuario").update(payload).eq("idUsuario", idUsuario).execute()
    return atual.data[0]


@router.delete("/alunos/{idUsuario}")
def deletar_aluno(idUsuario: int, admin=Depends(get_admin)):
    supabase.table("Usuario").delete().eq("idUsuario", idUsuario).execute()
    return {"message": "Aluno removido"}


@router.get("/comunidade")
def listar_comunidade(admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("usuTipo", "Comunidade").order("usuNome").execute()
    return resp.data or []


@router.post("/comunidade")
def criar_comunidade(data: UsuarioCreate, admin=Depends(get_admin)):
    email_existe_admin = supabase.table("Administrador").select("*").eq("admEmail", data.email).execute()
    if email_existe_admin.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado como administrador")

    exist = supabase.table("Usuario").select("*").eq("usuEmail", data.email).execute()
    if exist.data:
        raise HTTPException(status_code=400, detail="Membro já existe")

    novo = {
        "usuNome": data.nome,
        "usuEmail": data.email,
        "usuSenha": hash_password(data.senha),
        "usuTelefone": data.telefone,
        "usuTelefoneResponsavel": data.telefoneResponsavel,
        "usuEndereco": data.endereco,
        "usuCPF": data.cpf,
        "usuTipo": "Comunidade",
        "usuStatus": parse_status(data.status)
    }
    criado = supabase.table("Usuario").insert(novo).execute()
    return criado.data[0]


@router.put("/comunidade/{idUsuario}")
def atualizar_comunidade(idUsuario: int, data: UsuarioUpdate, admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("idUsuario", idUsuario).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Membro não encontrado")

    payload = {}
    if data.nome is not None:
        payload["usuNome"] = data.nome
    if data.email is not None:
        payload["usuEmail"] = normalize_email(data.email)
    if data.senha is not None:
        payload["usuSenha"] = hash_password(data.senha)
    if data.telefone is not None:
        payload["usuTelefone"] = data.telefone
    if data.telefoneResponsavel is not None:
        payload["usuTelefoneResponsavel"] = data.telefoneResponsavel
    if data.endereco is not None:
        payload["usuEndereco"] = data.endereco
    if data.cpf is not None:
        payload["usuCPF"] = data.cpf
    if data.status is not None:
        payload["usuStatus"] = parse_status(data.status)

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    atual = supabase.table("Usuario").update(payload).eq("idUsuario", idUsuario).execute()
    return atual.data[0]


@router.delete("/comunidade/{idUsuario}")
def deletar_comunidade(idUsuario: int, admin=Depends(get_admin)):
    supabase.table("Usuario").delete().eq("idUsuario", idUsuario).execute()
    return {"message": "Membro removido"}
