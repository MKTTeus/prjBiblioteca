import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from dotenv import load_dotenv

from database import supabase

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY não configurada. Defina a variável de ambiente SECRET_KEY "
        "(uma string aleatória e secreta, ex.: gerada com `openssl rand -hex 32`) "
        "no seu .env antes de iniciar o backend."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 6


TAMANHO_LOTE_SUPABASE = 100


def utc_now() -> datetime:
    """Retorna o instante atual como datetime aware em UTC."""
    return datetime.now(timezone.utc)


def datetime_utc(value: str | datetime) -> datetime:
    """Normaliza timestamps do banco (com ou sem timezone) para UTC aware."""
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00")) if isinstance(value, str) else value
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def buscar_todos(criar_consulta) -> list:
    """Busca TODAS as linhas de uma consulta Supabase, paginando em blocos de
    TAMANHO_LOTE_SUPABASE via .range().

    Necessário porque o projeto Supabase tem um limite de linhas por
    requisição (Max Rows, configurado no painel do Supabase em
    Settings > API): qualquer .execute() sem paginação explícita é truncado
    nesse limite, mesmo que existam mais linhas atendendo ao filtro — sem
    erro nenhum, o `.data` simplesmente vem incompleto.

    `criar_consulta` deve ser uma função sem argumentos que retorna um query
    builder do Supabase ainda não executado (ex.: lambda: supabase.table(...)
    .select(...).eq(...)), para que possamos encadear `.range()` nele antes
    de chamar `.execute()`.
    """
    registros = []
    inicio = 0
    while True:
        resposta = criar_consulta().range(inicio, inicio + TAMANHO_LOTE_SUPABASE - 1).execute()
        pagina = resposta.data or []
        registros.extend(pagina)
        if len(pagina) < TAMANHO_LOTE_SUPABASE:
            break
        inicio += TAMANHO_LOTE_SUPABASE
    return registros


def executar_em_paralelo(*funcoes):
    if not funcoes:
        return []
    if len(funcoes) == 1:
        return [funcoes[0]()]
    with ThreadPoolExecutor(max_workers=len(funcoes)) as executor:
        futures = [executor.submit(f) for f in funcoes]
        return [f.result() for f in futures]


def get_session_timeout_minutes() -> int:
    try:
        resp = supabase.table("Configuracoes").select("valor").eq("chave", "timeout_sessao").limit(1).execute()
        if resp.data:
            return int(resp.data[0]["valor"])
    except Exception:
        pass
    return ACCESS_TOKEN_EXPIRE_HOURS * 60  # fallback: 360 min

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def parse_status(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ["ativo", "true", "1", "sim", "yes"]
    return True


def normalize_email(email: Optional[str]) -> Optional[str]:
    if email is None:
        return None
    return email.strip().lower()


def normalize_cpf(cpf: Optional[str]) -> Optional[str]:
    """Retorna apenas os dígitos do CPF (ou None se vazio)."""
    if cpf is None:
        return None
    digitos = "".join(filter(str.isdigit, str(cpf)))
    return digitos or None


def validar_cpf(cpf: Optional[str]) -> bool:
    """Valida um CPF conferindo os dígitos verificadores.

    Aceita CPF formatado ou apenas dígitos. Retorna True se for válido.
    """
    if not cpf:
        return False

    numeros = "".join(filter(str.isdigit, str(cpf)))

    # Deve ter 11 dígitos e não pode ser uma sequência repetida (ex.: 11111111111)
    if len(numeros) != 11 or numeros == numeros[0] * 11:
        return False

    def calcular_digito(qtd: int) -> int:
        soma = sum(int(numeros[i]) * (qtd + 1 - i) for i in range(qtd))
        resto = (soma * 10) % 11
        return 0 if resto == 10 else resto

    return calcular_digito(9) == int(numeros[9]) and calcular_digito(10) == int(numeros[10])


def create_token(data: dict) -> str:
    minutes = get_session_timeout_minutes()
    expire = utc_now() + timedelta(minutes=minutes)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def get_admin(token: str = Depends(oauth2_scheme)):
    """Exige um administrador da equipe gestora (admProfessor = false).

    Usada em todas as rotas administrativas existentes. Um professor
    (admProfessor = true) autentica com tipo "admin" mas é bloqueado aqui,
    o que restringe automaticamente todo o painel administrativo a ele
    sem precisar alterar rota por rota.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("tipo") != "admin":
            raise HTTPException(status_code=403, detail="Acesso restrito a admins")
        if payload.get("admProfessor"):
            raise HTTPException(status_code=403, detail="Acesso restrito à equipe gestora")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")


def get_professor(token: str = Depends(oauth2_scheme)):
    """Exige um administrador marcado como professor (admProfessor = true)."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("tipo") != "admin" or not payload.get("admProfessor"):
            raise HTTPException(status_code=403, detail="Acesso restrito a professores")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")


def get_admin_ou_professor(token: str = Depends(oauth2_scheme)):
    """Aceita qualquer administrador (equipe gestora OU professor).

    Uso restrito a endpoints que ambos os perfis podem acessar, como o
    próprio perfil (/admin/me). Não usar em rotas administrativas gerais.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("tipo") != "admin":
            raise HTTPException(status_code=403, detail="Acesso restrito a admins")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")


def get_optional_user(token: Optional[str] = Depends(oauth2_scheme)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_admin_id(admin):
    admin_db = supabase.table("Administrador") \
        .select("idAdmin") \
        .eq("admEmail", admin["sub"]) \
        .execute()

    return admin_db.data[0]["idAdmin"] if admin_db.data else None


def gerar_tombos(quantidade: int, prefixo: str = "T"):
    resp = (
        supabase
        .table("Exemplar")
        .select("exeLivTombo")
        .like("exeLivTombo", f"{prefixo}%")
        .order("exeLivTombo", desc=True)
        .limit(1)
        .execute()
    )

    numero = 1

    if resp.data:
        ultimo = resp.data[0]["exeLivTombo"]
        try:
            numero = int(ultimo.replace(prefixo, "")) + 1
        except:
            numero = 1

    tombos = []
    for i in range(quantidade):
        tombos.append(f"{prefixo}{str(numero + i).zfill(4)}")

    return tombos
