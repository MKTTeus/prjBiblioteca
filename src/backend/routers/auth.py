import hashlib
import os
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Request

from database import supabase
from core import hash_password, normalize_email, parse_status, verify_password, create_token, validar_cpf, normalize_cpf
from rate_limit import limitar_login, limitar_signup, limitar_esqueci_senha, limitar_redefinir_senha
from routers.emails import enviar_email, _email_redefinir_senha
from schemas import Login, Signup, EsqueciSenha, RedefinirSenha

router = APIRouter()

RESET_TOKEN_TTL_MINUTOS = 30
MENSAGEM_RESET_GENERICA = {
    "message": "Se o e-mail informado estiver cadastrado, enviaremos um link de redefinição de senha."
}
TOKEN_INVALIDO_OU_EXPIRADO = "Link inválido ou expirado. Solicite uma nova redefinição de senha."


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _frontend_base_url(request: Request) -> str:
    configurado = os.getenv("FRONTEND_URL")
    if configurado:
        return configurado.rstrip("/")

    origin = request.headers.get("origin") or request.headers.get("referer")
    if origin:
        # remove path/hash eventualmente presentes no referer
        origin = origin.split("/#")[0]
        return origin.rstrip("/")

    return "http://localhost:3000"


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


@router.post("/esqueci-senha")
def esqueci_senha(data: EsqueciSenha, request: Request):
    email = normalize_email(data.email)

    limitar_esqueci_senha(request, email)

    # A resposta é sempre a mesma, exista ou não o e-mail, para não revelar
    # quais e-mails estão cadastrados no sistema.
    usuario_resp = (
        supabase.table("Usuario")
        .select("idUsuario, usuNome, usuEmail, usuStatus")
        .eq("usuEmail", email)
        .limit(1)
        .execute()
    )

    if not usuario_resp.data:
        return MENSAGEM_RESET_GENERICA

    usuario = usuario_resp.data[0]

    if not parse_status(usuario.get("usuStatus")):
        return MENSAGEM_RESET_GENERICA

    token = secrets.token_urlsafe(32)
    expira_em = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_TTL_MINUTOS)

    supabase.table("RedefinicaoSenha").insert({
        "usuEmail": usuario["usuEmail"],
        "tokenHash": _hash_token(token),
        "expiraEm": expira_em.isoformat(),
    }).execute()

    link = f"{_frontend_base_url(request)}/#/redefinir-senha?token={token}"
    html = _email_redefinir_senha(usuario.get("usuNome", "aluno(a)"), link, RESET_TOKEN_TTL_MINUTOS)

    enviar_email(usuario["usuEmail"], "Redefinição de senha — Sistema de Biblioteca", html)

    return MENSAGEM_RESET_GENERICA


@router.post("/redefinir-senha")
def redefinir_senha(data: RedefinirSenha, request: Request):
    limitar_redefinir_senha(request)

    token_hash = _hash_token(data.token)

    resp = (
        supabase.table("RedefinicaoSenha")
        .select("idRedefinicao, usuEmail, expiraEm, usadoEm")
        .eq("tokenHash", token_hash)
        .limit(1)
        .execute()
    )

    if not resp.data:
        raise HTTPException(status_code=400, detail=TOKEN_INVALIDO_OU_EXPIRADO)

    registro = resp.data[0]

    if registro.get("usadoEm"):
        raise HTTPException(status_code=400, detail=TOKEN_INVALIDO_OU_EXPIRADO)

    try:
        expira_em = datetime.fromisoformat(registro["expiraEm"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=TOKEN_INVALIDO_OU_EXPIRADO)

    if datetime.utcnow() > expira_em:
        raise HTTPException(status_code=400, detail=TOKEN_INVALIDO_OU_EXPIRADO)

    supabase.table("Usuario").update({
        "usuSenha": hash_password(data.novaSenha)
    }).eq("usuEmail", registro["usuEmail"]).execute()

    supabase.table("RedefinicaoSenha").update({
        "usadoEm": datetime.utcnow().isoformat()
    }).eq("idRedefinicao", registro["idRedefinicao"]).execute()

    return {"message": "Senha redefinida com sucesso. Você já pode fazer login com a nova senha."}