import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel
from supabase import create_client, Client

# ================= CONFIGURAÇÃO ================= #
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SECRET_KEY = os.getenv("SECRET_KEY", "segredo-super-seguro")
CAPAS_BUCKET = os.getenv("CAPAS_BUCKET", "capas")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL ou SUPABASE_KEY não foram carregados corretamente.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ajustar em produção
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#  MODELS  #
class LivroData(BaseModel):
    livTitulo: str
    livAutor: str
    livISBN: Optional[str] = None
    livDescricao: Optional[str] = None
    livEditora: Optional[str] = None
    livAnoPublicacao: Optional[str] = None
    livPaginas: Optional[int] = None
    livCapaURL: Optional[str] = None
    livCapaCaminho: Optional[str] = None
    idCategoria: Optional[int] = 1
    idGenero: Optional[int] = 1  # <-- adicione aqui

class SignupData(BaseModel):
    nome: str
    email: str
    senha: str
    telefone: str
    telefoneResponsavel: Optional[str] = None
    endereco: str
    ra: str

    class Config:
        extra = "forbid"


class LoginData(BaseModel):
    email: str
    senha: str

    class Config:
        extra = "forbid"


class ExemplarIn(BaseModel):
    exeLivTombo: str
    exeLivStatus: Optional[str] = "Disponível"
    exeLivLocalizacao: Optional[str] = None

    class Config:
        extra = "forbid"


class LivroCreate(BaseModel):
    livro: LivroData
    exemplares: Optional[List[ExemplarIn]] = None
    livLocalizacao: Optional[str] = None

    class Config:
        extra = "allow"


class LivroUpdate(BaseModel):
    livTitulo: Optional[str] = None
    livAutor: Optional[str] = None
    livISBN: Optional[str] = None
    livDescricao: Optional[str] = None
    livEditora: Optional[str] = None
    livAnoPublicacao: Optional[str] = None
    livPaginas: Optional[int] = None
    livCapaURL: Optional[str] = None
    livCapaCaminho: Optional[str] = None
    idCategoria: Optional[int] = None

    class Config:
        extra = "forbid"


class ExemplarUpdate(BaseModel):
    exeLivStatus: Optional[str] = None
    exeLivLocalizacao: Optional[str] = None

    class Config:
        extra = "allow"


# ================= HELPERS AUTH ================= #
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_admin(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("tipo") != "admin":
            raise HTTPException(status_code=403, detail="Apenas administradores podem acessar este recurso")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ================= USERS ================= #
@app.post("/signup")
async def signup(form_data: SignupData):
    existing_resp = supabase.table("Aluno").select("*").eq("aluEmail", form_data.email).limit(1).execute()
    if existing_resp.data:
        raise HTTPException(status_code=400, detail="Este email já está cadastrado")

    hashed_password = hash_password(form_data.senha)

    response = supabase.table("Aluno").insert({
        "aluNome": form_data.nome,
        "aluEmail": form_data.email,
        "aluSenha": hashed_password,
        "aluTelefone": form_data.telefone,
        "aluTelefoneResponsavel": form_data.telefoneResponsavel,
        "aluEndereco": form_data.endereco,
        "aluRA": form_data.ra,
        "idAdmin": 1
    }).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Erro ao criar usuário")

    return {"message": "Aluno criado com sucesso!"}


@app.post("/login")
async def login(form_data: LoginData):
    # Login aluno
    aluno_resp = supabase.table("Aluno").select("*").eq("aluEmail", form_data.email).limit(1).execute()
    if aluno_resp.data:
        aluno = aluno_resp.data[0]
        if not verify_password(form_data.senha, aluno["aluSenha"]):
            raise HTTPException(status_code=400, detail="Email ou senha incorretos")
        access_token = create_access_token(
            data={"sub": aluno["aluEmail"], "tipo": "aluno", "idAluno": aluno.get("idAluno")})
        return {"access_token": access_token, "token_type": "bearer", "nome": aluno["aluNome"], "tipo": "aluno"}

    # Login admin
    admin_resp = supabase.table("Administrador").select("*").eq("admEmail", form_data.email).limit(1).execute()
    if admin_resp.data:
        admin = admin_resp.data[0]
        if not verify_password(form_data.senha, admin["admSenha"]):
            raise HTTPException(status_code=400, detail="Email ou senha incorretos")
        access_token = create_access_token(
            data={"sub": admin["admEmail"], "tipo": "admin", "idAdmin": admin.get("idAdmin")})
        return {"access_token": access_token, "token_type": "bearer", "nome": admin["admNome"], "tipo": "admin",
                "idAdmin": admin["idAdmin"]}

    raise HTTPException(status_code=400, detail="Email ou senha incorretos")


# ================= LIVROS ================= #
@app.post("/livros")
async def criar_livro(livro: LivroCreate, admin=Depends(get_current_admin)):
    try:
        if not livro.livro.livTitulo or not livro.livro.livAutor:
            raise HTTPException(status_code=400, detail="Título e autor são obrigatórios")

        if livro.livro.livISBN:
            existing = supabase.table("Livro").select("*").eq("livISBN", livro.livro.livISBN).execute()
            if existing.data:
                raise HTTPException(status_code=400, detail="Este ISBN já está cadastrado")

        payload = {
            "livTitulo": livro.livro.livTitulo,
            "livAutor": livro.livro.livAutor,
            "livISBN": livro.livro.livISBN,
            "livDescricao": livro.livro.livDescricao,
            "livEditora": livro.livro.livEditora,
            "livAnoPublicacao": livro.livro.livAnoPublicacao,
            "livPaginas": livro.livro.livPaginas,
            "livCapaURL": livro.livro.livCapaURL,
            "livCapaCaminho": livro.livro.livCapaCaminho,
            "idCategoria": livro.livro.idCategoria or 1,
            "idGenero": livro.livro.idGenero or 1,
            "idAdmin": admin.get("idAdmin"),
        }

        created = supabase.table("Livro").insert(payload).execute()
        if not created.data:
            raise HTTPException(status_code=500, detail="Erro ao cadastrar livro")

        id_livro = created.data[0]["idLivro"]

        # Cria os exemplares
        exemplares_created = []
        if livro.exemplares:
            for ex in livro.exemplares:
                ex_record = {
                    "idLivro": id_livro,
                    "exeLivTombo": ex.exeLivTombo,
                    "exeLivStatus": ex.exeLivStatus or "Disponível",
                    "exeLivLocalizacao": ex.exeLivLocalizacao or livro.livLocalizacao
                }
                resp = supabase.table("ExemplarLivro").insert(ex_record).execute()
                exemplares_created.append(resp.data[0])

        return {"message": "Livro cadastrado com sucesso!", "livro": created.data[0],
                "exemplaresCriados": exemplares_created}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/livros")
async def listar_livros(user=Depends(get_current_user)):
    """Qualquer usuário logado pode ver os livros"""
    try:
        resp = supabase.table("Livro").select("*").execute()
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/livros/{idLivro}")
async def atualizar_livro(idLivro: int, livro: LivroUpdate, admin=Depends(get_current_admin)):
    existing = supabase.table("Livro").select("*").eq("idLivro", idLivro).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    payload = {k: v for k, v in livro.dict().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    updated = supabase.table("Livro").update(payload).eq("idLivro", idLivro).execute()
    return {"message": "Livro atualizado com sucesso!", "livro": updated.data[0]}


@app.delete("/livros/{idLivro}")
async def deletar_livro(idLivro: int, admin=Depends(get_current_admin)):
    supabase.table("ExemplarLivro").delete().eq("idLivro", idLivro).execute()
    supabase.table("Livro").delete().eq("idLivro", idLivro).execute()
    return {"message": "Livro e exemplares deletados com sucesso!"}


# ================= EXEMPLARES ================= #
@app.get("/exemplares/{idLivro}")
async def listar_exemplares(idLivro: int, user=Depends(get_current_user)):
    resp = supabase.table("ExemplarLivro").select("*").eq("idLivro", idLivro).order("exeLivTombo", {"ascending": True}).execute()
    return resp.data



@app.put("/exemplares/{idExemplar}")
async def atualizar_exemplar(idExemplar: int, data: ExemplarUpdate, admin=Depends(get_current_admin)):
    exist = supabase.table("ExemplarLivro").select("*").eq("idExemplar", idExemplar).execute()
    if not exist.data:
        raise HTTPException(status_code=404, detail="Exemplar não encontrado")
    payload = {k: v for k, v in data.dict().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    updated = supabase.table("ExemplarLivro").update(payload).eq("idExemplar", idExemplar).execute()
    return {"message": "Exemplar atualizado", "exemplar": updated.data[0]}


# UPLOAD CAPA#
@app.post("/upload-capa")
async def upload_capa(file: UploadFile = File(...), admin=Depends(get_current_admin)):
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_bytes = await file.read()
    res = supabase.storage.from_(CAPAS_BUCKET).upload(filename, file_bytes)
    if res.get("error"):
        raise HTTPException(status_code=500, detail=str(res["error"]))
    public = supabase.storage.from_(CAPAS_BUCKET).get_public_url(filename)
    public_url = public.get("publicUrl") or public.get("public_url") or None
    return {"url": public_url, "path": filename}
#categoria#
@app.get("/categorias")
async def listar_categorias(user=Depends(get_current_user)):
    """
    Retorna todas as categorias cadastradas.
    Qualquer usuário logado pode acessar.
    """
    try:
        resp = supabase.table("CategoriaLivro").select("*").order("catNome").execute()
        print("Categorias retornadas do Supabase:", resp.data)
        categorias = resp.data or []  # garante array vazio se nada for retornado
        return categorias
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar categorias: {str(e)}")
#generos#
@app.get("/generos")
async def listar_generos(user=Depends(get_current_user)):
    """
    Retorna todos os gêneros cadastrados.
    Qualquer usuário logado pode acessar.
    """
    try:
        resp = supabase.table("GeneroLivro").select("*").order("genNome").execute()
        print("Gêneros retornados do Supabase:", resp.data)
        generos = resp.data or []  # garante array vazio se nada for retornado
        return generos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar gêneros: {str(e)}")