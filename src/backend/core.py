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


def create_token(data: dict, expires_hours: int = ACCESS_TOKEN_EXPIRE_HOURS) -> str:
    expire = datetime.utcnow() + timedelta(hours=expires_hours)
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
        .table("ExemplarLivro")
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
