import hashlib
import os
import secrets
from datetime import timedelta

from fastapi import APIRouter, HTTPException, Request

from database import supabase
from core import (
    datetime_utc,
    hash_password,
    normalize_cpf,
    normalize_email,
    parse_status,
    utc_now,
    verify_password,
    create_token,
)
from rate_limit import limitar_login, limitar_esqueci_senha, limitar_redefinir_senha
from routers.emails import enviar_email, _email_redefinir_senha
from schemas import Login, EsqueciSenha, RedefinirSenha

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


def _buscar_usuario_por_login(login: str, tipo: str):
    """Busca um usuário pelo e-mail ou pelo identificador específico do tipo."""
    email = normalize_email(login)
    campos = "idUsuario, usuEmail, usuSenha, usuNome, usuTipo, usuStatus, usuSenhaProvisoria"

    por_email = (
        supabase.table("Usuario")
        .select(campos)
        .eq("usuTipo", tipo)
        .eq("usuEmail", email)
        .limit(1)
        .execute()
    )
    if por_email.data:
        return por_email.data[0]

    identificador = login.strip()
    if tipo == "Aluno":
        campo = "usuRA"
    else:
        campo = "usuCPF"
        identificador = normalize_cpf(identificador)

    if not identificador:
        return None

    por_identificador = (
        supabase.table("Usuario")
        .select(campos)
        .eq("usuTipo", tipo)
        .eq(campo, identificador)
        .limit(1)
        .execute()
    )
    return por_identificador.data[0] if por_identificador.data else None


@router.post("/login")
def login(data: Login, request: Request):
    identificador = data.email.strip()
    limitar_login(request, identificador.lower())

    credenciais_invalidas = "Email ou senha inválidos"

    if data.UserType == "Administrador":
        email = normalize_email(identificador)
        resp = (
            supabase.table("Administrador")
            .select("admEmail, admSenha, admNome, admStatus, admProfessor")
            .eq("admEmail", email)
            .limit(1)
            .execute()
        )

        if not resp.data:
            raise HTTPException(status_code=400, detail=credenciais_invalidas)

        admin = resp.data[0]

        if not parse_status(admin.get("admStatus")):
            raise HTTPException(status_code=400, detail="Conta de administrador desativada")

        if not verify_password(data.senha, admin["admSenha"]):
            raise HTTPException(status_code=400, detail=credenciais_invalidas)

        eh_professor = bool(admin.get("admProfessor"))
        token = create_token({
            "sub": admin["admEmail"],
            "tipo": "admin",
            "admProfessor": eh_professor,
        })

        return {
            "access_token": token,
            "tipo": "admin",
            "nome": admin["admNome"],
            "professor": eh_professor,
        }

    if data.UserType in ["Aluno", "Comunidade"]:
        usuario = _buscar_usuario_por_login(identificador, data.UserType)
        if not usuario:
            raise HTTPException(status_code=400, detail=credenciais_invalidas)

        if not parse_status(usuario.get("usuStatus")):
            raise HTTPException(status_code=400, detail="Conta de usuario desativada")

        if not verify_password(data.senha, usuario["usuSenha"]):
            raise HTTPException(status_code=400, detail=credenciais_invalidas)

        token = create_token({
            # O e-mail continua sendo o subject para não quebrar os endpoints
            # que usam o token para localizar o usuário no banco.
            "sub": usuario["usuEmail"],
            "tipo": usuario["usuTipo"],
        })

        return {
            "access_token": token,
            "tipo": usuario["usuTipo"],
            "nome": usuario["usuNome"],
            "senhaProvisoria": bool(usuario.get("usuSenhaProvisoria")),
        }

    raise HTTPException(status_code=400, detail="Tipo inválido")


@router.post("/esqueci-senha")
def esqueci_senha(data: EsqueciSenha, request: Request):
    email = normalize_email(data.email)
    limitar_esqueci_senha(request, email)

    # A resposta é sempre a mesma, exista ou não o e-mail, para não revelar
    # quais contas estão cadastradas no sistema.
    usuario_resp = (
        supabase.table("Usuario")
        .select("idUsuario, usuNome, usuEmail, usuStatus")
        .eq("usuEmail", email)
        .limit(1)
        .execute()
    )
    admin_resp = (
        supabase.table("Administrador")
        .select("idAdmin, admNome, admEmail, admStatus")
        .eq("admEmail", email)
        .limit(1)
        .execute()
    )

    conta = usuario_resp.data[0] if usuario_resp.data else None
    email_conta = "usuEmail"
    nome_conta = "usuNome"
    status_conta = "usuStatus"
    if not conta and admin_resp.data:
        conta = admin_resp.data[0]
        email_conta = "admEmail"
        nome_conta = "admNome"
        status_conta = "admStatus"

    if not conta or not parse_status(conta.get(status_conta)):
        return MENSAGEM_RESET_GENERICA

    token = secrets.token_urlsafe(32)
    expira_em = utc_now() + timedelta(minutes=RESET_TOKEN_TTL_MINUTOS)

    supabase.table("RedefinicaoSenha").insert({
        "usuEmail": conta[email_conta],
        "tokenHash": _hash_token(token),
        "expiraEm": expira_em.isoformat(),
    }).execute()

    link = f"{_frontend_base_url(request)}/#/redefinir-senha?token={token}"
    html = _email_redefinir_senha(conta.get(nome_conta, "usuário(a)"), link, RESET_TOKEN_TTL_MINUTOS)
    enviar_email(conta[email_conta], "Redefinição de senha — Sistema de Biblioteca", html)

    return MENSAGEM_RESET_GENERICA


def _validar_token_redefinicao(token: str) -> dict:
    """Valida um token sem marcá-lo como usado."""
    token_hash = _hash_token(token)
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
        expira_em = datetime_utc(registro["expiraEm"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=TOKEN_INVALIDO_OU_EXPIRADO)

    if utc_now() > expira_em:
        raise HTTPException(status_code=400, detail=TOKEN_INVALIDO_OU_EXPIRADO)

    return registro


@router.get("/redefinir-senha/validar")
def validar_token_redefinicao(token: str, request: Request):
    limitar_redefinir_senha(request)
    _validar_token_redefinicao(token)
    return {"valido": True}


@router.post("/redefinir-senha")
def redefinir_senha(data: RedefinirSenha, request: Request):
    limitar_redefinir_senha(request)
    registro = _validar_token_redefinicao(data.token)
    nova_senha = hash_password(data.novaSenha)

    usuario_atualizado = supabase.table("Usuario").update({
        "usuSenha": nova_senha,
        "usuSenhaProvisoria": False,
    }).eq("usuEmail", registro["usuEmail"]).execute()

    # Administradores e professores vivem na tabela Administrador. O token
    # mantém o campo histórico usuEmail para compatibilidade com a migração
    # existente, mas a redefinição funciona para ambas as tabelas.
    admin_atualizado = supabase.table("Administrador").update({
        "admSenha": nova_senha,
    }).eq("admEmail", registro["usuEmail"]).execute()

    if not (usuario_atualizado.data or admin_atualizado.data):
        raise HTTPException(status_code=400, detail=TOKEN_INVALIDO_OU_EXPIRADO)

    supabase.table("RedefinicaoSenha").update({
        "usadoEm": utc_now().isoformat(),
    }).eq("idRedefinicao", registro["idRedefinicao"]).execute()

    return {"message": "Senha redefinida com sucesso. Você já pode fazer login com a nova senha."}
