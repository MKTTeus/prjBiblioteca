import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from dotenv import load_dotenv

from database import supabase

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "segredo")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 6

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
    expire = datetime.utcnow() + timedelta(minutes=minutes)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def get_admin(token: str = Depends(oauth2_scheme)):
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
