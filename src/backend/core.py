import os
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
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

# Cache de 60 segundos para token_version (evita consultar o banco a cada request)
_TOKEN_VERSION_CACHE: dict[str, tuple[int, float]] = {}  # key -> (token_version, timestamp)
_TOKEN_VERSION_CACHE_TTL = 60  # segundos


def _get_cache_key(table: str, email: str) -> str:
    return f"{table}:{email}"


def _get_cached_token_version(table: str, email: str) -> Optional[int]:
    """Retorna token_version do cache se ainda válido, senão None."""
    key = _get_cache_key(table, email)
    if key in _TOKEN_VERSION_CACHE:
        version, timestamp = _TOKEN_VERSION_CACHE[key]
        if time.time() - timestamp < _TOKEN_VERSION_CACHE_TTL:
            return version
        else:
            del _TOKEN_VERSION_CACHE[key]
    return None


def _set_cached_token_version(table: str, email: str, version: int) -> None:
    """Armazena token_version no cache com timestamp atual."""
    key = _get_cache_key(table, email)
    _TOKEN_VERSION_CACHE[key] = (version, time.time())


def _fetch_token_version_from_db(table: str, email: str) -> Optional[int]:
    """Busca token_version direto do banco."""
    try:
        if table == "Administrador":
            resp = supabase.table("Administrador").select("admTokenVersion").eq("admEmail", email).limit(1).execute()
            if resp.data:
                return resp.data[0].get("admTokenVersion", 1)
        elif table == "Usuario":
            resp = supabase.table("Usuario").select("usuTokenVersion").eq("usuEmail", email).limit(1).execute()
            if resp.data:
                return resp.data[0].get("usuTokenVersion", 1)
    except Exception:
        pass
    return None


def get_token_version(table: str, email: str) -> int:
    """Obtém token_version com cache de 60s."""
    cached = _get_cached_token_version(table, email)
    if cached is not None:
        return cached
    version = _fetch_token_version_from_db(table, email) or 1
    _set_cached_token_version(table, email, version)
    return version


def invalidate_token_version_cache(table: str, email: str) -> None:
    """Invalida o cache de token_version para forçar nova leitura do banco."""
    key = _get_cache_key(table, email)
    if key in _TOKEN_VERSION_CACHE:
        del _TOKEN_VERSION_CACHE[key]


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


def create_token(data: dict, token_version: int = 1) -> str:
    minutes = get_session_timeout_minutes()
    expire = datetime.utcnow() + timedelta(minutes=minutes)
    data.update({"exp": expire, "tv": token_version})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def _verify_token_version(payload: dict, table: str, email: str) -> None:
    """Verifica se o token_version do JWT corresponde ao do banco."""
    token_tv = payload.get("tv")
    if token_tv is None:
        # Token antigo sem token_version - invalida por segurança
        raise HTTPException(status_code=401, detail="Token inválido: versão ausente. Faça login novamente.")
    
    db_tv = get_token_version(table, email)
    if token_tv != db_tv:
        # Token version mismatch - invalida cache e rejeita
        invalidate_token_version_cache(table, email)
        raise HTTPException(status_code=401, detail="Token inválido: sessão expirada. Faça login novamente.")


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
        
        # Verifica token_version
        email = payload.get("sub")
        if email:
            _verify_token_version(payload, "Administrador", email)
        
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")


def get_professor(token: str = Depends(oauth2_scheme)):
    """Exige um administrador marcado como professor (admProfessor = true)."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("tipo") != "admin" or not payload.get("admProfessor"):
            raise HTTPException(status_code=403, detail="Acesso restrito a professores")
        
        # Verifica token_version
        email = payload.get("sub")
        if email:
            _verify_token_version(payload, "Administrador", email)
        
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
        
        # Verifica token_version
        email = payload.get("sub")
        if email:
            _verify_token_version(payload, "Administrador", email)
        
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


def get_user(token: str = Depends(oauth2_scheme)):
    """Exige um usuário autenticado (Aluno ou Comunidade) com token_version válido."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("tipo") not in ("Aluno", "Comunidade"):
            raise HTTPException(status_code=403, detail="Acesso restrito a usuários")
        
        # Verifica token_version
        email = payload.get("sub")
        if email:
            _verify_token_version(payload, "Usuario", email)
        
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