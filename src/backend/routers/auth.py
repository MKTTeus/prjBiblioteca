from fastapi import APIRouter, HTTPException

from database import supabase
from core import hash_password, normalize_email, verify_password, create_token
from schemas import Login, Signup

router = APIRouter()


@router.post("/login")
def login(data: Login):
    email = normalize_email(data.email)

    admin_resp = supabase.table("Administrador").select("*").eq("admEmail", email).execute()
    if admin_resp.data:
        a = admin_resp.data[0]
        if verify_password(data.senha, a["admSenha"]):
            token = create_token({"sub": a["admEmail"], "tipo": "admin"})
            return {"access_token": token, "tipo": "admin", "nome": a["admNome"]}

    user_resp = supabase.table("Usuario").select("*").eq("usuEmail", email).execute()
    if user_resp.data:
        u = user_resp.data[0]
        if verify_password(data.senha, u["usuSenha"]):
            token = create_token({"sub": u["usuEmail"], "tipo": "usuario"})
            return {"access_token": token, "tipo": "usuario", "nome": u["usuNome"]}

    raise HTTPException(status_code=400, detail="Email ou senha inválidos")


@router.post("/signup")
def signup(data: Signup):
    if data.tipo not in ["Aluno", "Comunidade"]:
        raise HTTPException(status_code=400, detail="Tipo inválido")

    email = normalize_email(data.email)

    email_existe_admin = supabase.table("Administrador").select("*").eq("admEmail", email).execute()
    email_existe_usuario = supabase.table("Usuario").select("*").eq("usuEmail", email).execute()
    if email_existe_admin.data or email_existe_usuario.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    novo_usuario = {
        "usuNome": data.nome,
        "usuEmail": email,
        "usuSenha": hash_password(data.senha),
        "usuTelefone": data.telefone,
        "usuTelefoneResponsavel": data.telefoneResponsavel,
        "usuEndereco": data.endereco,
        "usuRA": data.ra,
        "usuCPF": data.cpf,
        "usuTipo": data.tipo,
        "usuStatus": True
    }
    supabase.table("Usuario").insert(novo_usuario).execute()

    return {"message": "Conta criada com sucesso"}
