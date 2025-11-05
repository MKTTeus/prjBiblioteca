import os
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from supabase import create_client, Client

# 🔹 CONFIGURAÇÕES INICIAIS
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    raise ValueError("SUPABASE_URL ou SUPABASE_KEY não foram carregados corretamente.")

supabase: Client = create_client(url, key)

SECRET_KEY = "segredo-super-seguro"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()

# 🔹 CORS — permite conexão com React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔹 MODELOS
class SignupData(BaseModel):
    nome: str
    email: str
    senha: str

class LoginData(BaseModel):
    email: str
    senha: str

class Token(BaseModel):
    access_token: str
    token_type: str

# 🔹 FUNÇÕES AUXILIARES
def hash_password(password: str) -> str:
    # Trunca para 72 bytes e faz hash
    return pwd_context.hash(password.encode('utf-8')[:72])

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password.encode('utf-8')[:72], hashed_password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# signup endpoint
@app.post("/signup")
async def signup(form_data: SignupData):
    # Verifica se email já existe
    existing = supabase.table("Administrador").select("*").eq("admEmail", form_data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Este email já está cadastrado")

    hashed_password = hash_password(form_data.senha)

    # Insere novo admin
    response = supabase.table("Administrador").insert({
        "admNome": form_data.nome,      # agora envia o nome
        "admEmail": form_data.email,
        "admSenha": hashed_password
    }).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Erro ao criar usuário")

    return {"message": "Administrador criado com sucesso!"}


# 🔹 ENDPOINT DE LOGIN
@app.post("/login", response_model=Token)
async def login(form_data: LoginData):
    response = supabase.table("Administrador").select("*").eq("admEmail", form_data.email).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Email ou senha incorretos")

    admin = response.data[0]
    senha_cadastrada = admin["admSenha"]

    if not verify_password(form_data.senha, senha_cadastrada):
        raise HTTPException(status_code=400, detail="Email ou senha incorretos")

    access_token = create_access_token(data={"sub": admin["admEmail"]})
    return {"access_token": access_token, "token_type": "bearer"}
