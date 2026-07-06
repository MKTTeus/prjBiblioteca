from fastapi import APIRouter, HTTPException, Request

from database import supabase
from core import hash_password, normalize_email, parse_status, verify_password, create_token, validar_cpf, normalize_cpf
from backend.rate_limit import limitar_login, limitar_signup
from schemas import Login, Signup

router = APIRouter()


@router.post("/login")
def login(data: Login, request: Request):
    email = normalize_email(data.email)

    limitar_login(request, email)

    CREDENCIAIS_INVALIDAS = "Email ou senha inválidos"

    if data.UserType == "Administrador":
        resp = (
            supabase.table("Administrador")
            .select("admEmail, admSenha, admNome, admStatus")
            .eq("admEmail", email)
            .limit(1)
            .execute()
        )

        if not resp.data:
            raise HTTPException(status_code=400, detail=CREDENCIAIS_INVALIDAS)

        a = resp.data[0]

        if not parse_status(a.get("admStatus")):
            raise HTTPException(status_code=400, detail="Conta de administrador desativada")

        if not verify_password(data.senha, a["admSenha"]):
            raise HTTPException(status_code=400, detail=CREDENCIAIS_INVALIDAS)

        token = create_token({
            "sub": a["admEmail"],
            "tipo": "admin"
        })

        return {
            "access_token": token,
            "tipo": "admin",
            "nome": a["admNome"]
        }

    elif data.UserType in ["Aluno", "Comunidade"]:
        # Primeiro verifica se existe usuário independente do tipo
        usuario_resp = (
            supabase.table("Usuario")
            .select("usuEmail, usuSenha, usuNome, usuTipo, usuStatus")
            .eq("usuEmail", email)
            .limit(1)
            .execute()
        )

        if not usuario_resp.data:
            raise HTTPException(status_code=400, detail=CREDENCIAIS_INVALIDAS)

        u = usuario_resp.data[0]

        if not parse_status(u.get("usuStatus")):
            raise HTTPException(status_code=400, detail="Conta de usuario desativada")

        if u["usuTipo"] != data.UserType:
            raise HTTPException(status_code=400, detail=CREDENCIAIS_INVALIDAS)

        # Verifica senha
        if not verify_password(data.senha, u["usuSenha"]):
            raise HTTPException(status_code=400, detail=CREDENCIAIS_INVALIDAS)

        token = create_token({
            "sub": u["usuEmail"],
            "tipo": u["usuTipo"]
        })

        return {
            "access_token": token,
            "tipo": u["usuTipo"],
            "nome": u["usuNome"]
        }

    else:
        raise HTTPException(status_code=400, detail="Tipo inválido")
        
@router.post("/signup")
def signup(data: Signup, request: Request):
    limitar_signup(request)

    if data.tipo not in ["Aluno", "Comunidade"]:
        raise HTTPException(status_code=400, detail="Tipo inválido")

    cpf = normalize_cpf(data.cpf)
    if data.tipo == "Comunidade" and not validar_cpf(cpf):
        raise HTTPException(status_code=400, detail="CPF inválido")

    email = normalize_email(data.email)

    email_existe_admin = supabase.table("Administrador").select("*").eq("admEmail", email).execute()
    email_existe_usuario = supabase.table("Usuario").select("usuEmail").eq("usuEmail", email).execute()
    if email_existe_admin.data or email_existe_usuario.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    if cpf:
        cpf_existe = supabase.table("Usuario").select("idUsuario").eq("usuCPF", cpf).eq("usuExcluido", False).execute()
        if cpf_existe.data:
            raise HTTPException(status_code=400, detail="CPF já cadastrado")

    novo_usuario = {
        "usuNome": data.nome,
        "usuEmail": email,
        "usuSenha": hash_password(data.senha),
        "usuTelefone": data.telefone,
        "usuTelefoneResponsavel": data.telefoneResponsavel,
        "usuEndereco": data.endereco,
        "usuRA": data.ra,
        "usuCPF": cpf,
        "usuTipo": data.tipo,
        "usuStatus": True
    }
    supabase.table("Usuario").insert(novo_usuario).execute()

    return {"message": "Conta criada com sucesso"}