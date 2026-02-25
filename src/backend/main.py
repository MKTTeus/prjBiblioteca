#LOGIN MODIFICADO PRECISA SER TESTADO

import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Union

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import logging
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict
from supabase import create_client, Client

#  CONFIGURAÇÃO  #
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
    livDescricao: Optional[str] = None
    livEditora: Optional[str] = None
    livAnoPublicacao: Optional[str] = None
    livPaginas: Optional[int] = None
    livCapaURL: Optional[str] = None
    livCapaCaminho: Optional[str] = None
    idCategoria: Optional[int] = 1
    idGenero: Optional[int] = 1

class SignupData(BaseModel):
    nome: str
    email: str
    senha: str
    telefone: str
    telefoneResponsavel: Optional[str] = None
    endereco: str
    ra: Optional[str] = None
    cpf: Optional[str] = None
    tipo: str
    model_config = ConfigDict(extra="forbid")


class LoginData(BaseModel):
    email: str
    senha: str

    model_config = ConfigDict(extra="forbid")


class ExemplarIn(BaseModel):
    exeLivTombo: str
    exeLivStatus: Optional[str] = "Disponível"
    exeLivLocalizacao: Optional[str] = None
    exeLivISBN: Optional[str] = None

    model_config = ConfigDict(extra="forbid")


class LivroCreate(BaseModel):
    livro: LivroData
    exemplares: Optional[List[ExemplarIn]] = None
    livLocalizacao: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class LivroUpdate(BaseModel):
    livTitulo: Optional[str] = None
    livAutor: Optional[str] = None
    livDescricao: Optional[str] = None
    livEditora: Optional[str] = None
    livAnoPublicacao: Optional[str] = None
    livPaginas: Optional[int] = None
    livCapaURL: Optional[str] = None
    livCapaCaminho: Optional[str] = None
    idCategoria: Optional[int] = None

    model_config = ConfigDict(extra="forbid")


class ExemplarUpdate(BaseModel):
    exeLivStatus: Optional[str] = None
    exeLivLocalizacao: Optional[str] = None
    exeLivISBN: Optional[str] = None

    model_config = ConfigDict(extra="allow")

class AdminIn(BaseModel):
    nome: str
    email: str
    senha: str
    status: Optional[Union[str, bool]] = "Ativo"


class AdminUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    status: Optional[Union[str, bool]] = None
    senha: Optional[str] = None  

    model_config = ConfigDict(extra="forbid")


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    telefoneResponsavel: Optional[str] = None
    endereco: Optional[str] = None
    ra: Optional[str] = None
    cpf: Optional[str] = None
    tipo: Optional[str] = None
    status: Optional[str] = None
    senha: str = None

    model_config = ConfigDict(extra="forbid")

#  HELPERS AUTH  #
BCRYPT_PREFIX = ("$2a$", "$2b$", "$2y$")

def is_bcrypt_hash(value: str) -> bool:
    return isinstance(value, str) and value.startswith(BCRYPT_PREFIX)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, stored_value: str) -> tuple[bool, bool]:
    """
    Returns (is_valid, needs_migration).
    - If stored_value is bcrypt, verify with passlib and flag if hash needs update.
    - If stored_value is not a recognized bcrypt hash, perform plaintext fallback.
      If it matches, returns (True, True) to trigger migration.
    """
    if not isinstance(stored_value, str) or stored_value == "":
        return (False, False)
    if is_bcrypt_hash(stored_value):
        try:
            valid = pwd_context.verify(plain_password, stored_value)
            migrate = valid and pwd_context.needs_update(stored_value)
            return (valid, migrate)
        except Exception:
            return (False, False)
    # legacy/plaintext fallback
    if plain_password == stored_value:
        return (True, True)
    return (False, False)


def parse_status(value) -> bool:
    if value is None:
        return True  # default to active
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        v = value.strip().lower()
        if v in {"ativo", "active", "true", "1", "on", "yes"}:
            return True
        if v in {"inativo", "inactive", "false", "0", "off", "no"}:
            return False
    raise HTTPException(status_code=400, detail="Status inválido. Use 'Ativo'/'Inativo' ou booleano.")


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
    except JWTError as e:
        # Log token and error to help debugging (avoid in production)
        logger = logging.getLogger("uvicorn.error")
        try:
            logger.debug("Falha ao decodificar token: %s; erro: %s", token, e)
        except Exception:
            logger.debug("Falha ao decodificar token (token omitted for safety); erro: %s", e)
        raise HTTPException(status_code=401, detail="Token inválido")


def get_optional_user(request: Request):
    """Development helper: returns decoded token payload or None when no/invalid token.
    Use only for development/testing to allow anonymous access to endpoints.
    """
    auth = request.headers.get("Authorization")
    if not auth:
        return None
    parts = auth.split()
    if len(parts) != 2:
        return None
    scheme, token = parts
    if scheme.lower() != "bearer":
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        # invalid token -> treat as anonymous for dev
        return None

#  USERS  #
@app.post("/signup")
async def signup(form_data: SignupData):
    logger = logging.getLogger("uvicorn.error")
    try:
        existing_resp = supabase.table("Usuario").select("*").eq("usuEmail", form_data.email).limit(1).execute()
        if existing_resp.data:
            raise HTTPException(status_code=400, detail="Este email já está cadastrado")

        hashed_password = hash_password(form_data.senha)

        response = supabase.table("Usuario").insert({
            "usuNome": form_data.nome,
            "usuEmail": form_data.email,
            "usuSenha": hashed_password,
            "usuTelefone": form_data.telefone,
            "usuTelefoneResponsavel": form_data.telefoneResponsavel,
            "usuEndereco": form_data.endereco,
            "usuCPF": form_data.cpf,
            "usuRA": form_data.ra,
            "usuTipo": form_data.tipo,
        }).execute()

        if not response.data:
            logger.error("Supabase returned no data on insert for user %s: %s", form_data.email, response)
            raise HTTPException(status_code=500, detail="Erro ao criar usuário")

        return {"message": "Usuario criado com sucesso!"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro ao criar usuário: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/login")
async def login(form_data: LoginData):
    # Login aluno
    usuario_resp = supabase.table("Usuario").select("*").eq("usuEmail", form_data.email).limit(1).execute()

    if usuario_resp.data :
        usuario = usuario_resp.data[0]

        print("DEBUG usuSenha:", usuario["usuSenha"])

        is_valid, needs_mig = verify_password(form_data.senha, usuario["usuSenha"])
        if not is_valid:
            raise HTTPException(status_code=400, detail="Email ou senha incorretos")
        if needs_mig:
            try:
                new_hash = hash_password(form_data.senha)
                supabase.table("Usuario").update({"usuSenha": new_hash}).eq("idUsuario", usuario.get("idUsuario")).execute()
            except Exception:
                pass
        access_token = create_access_token(
            data={"sub": usuario["usuEmail"], "tipo": "usuario", "idUsuario": usuario.get("idUsuario")})
        return {"access_token": access_token, "token_type": "bearer", "nome": usuario["usuNome"], "tipo": "usuario"}

    # Login admin
    admin_resp = supabase.table("Administrador").select("*").eq("admEmail", form_data.email).limit(1).execute()
    if admin_resp.data:
        admin = admin_resp.data[0]
        print("DEBUG admSenha:", admin["admSenha"])
        is_valid, needs_mig = verify_password(form_data.senha, admin["admSenha"])
        if not is_valid:
            raise HTTPException(status_code=400, detail="Email ou senha incorretos")
        if needs_mig:
            try:
                new_hash = hash_password(form_data.senha)
                supabase.table("Administrador").update({"admSenha": new_hash}).eq("idAdmin", admin.get("idAdmin")).execute()
            except Exception:
                pass
        access_token = create_access_token(
            data={"sub": admin["admEmail"], "tipo": "admin", "idAdmin": admin.get("idAdmin")})
        return {"access_token": access_token, "token_type": "bearer", "nome": admin["admNome"], "tipo": "admin",
                "idAdmin": admin["idAdmin"]}

    raise HTTPException(status_code=400, detail="Email ou senha incorretos")


#  LIVROS  
@app.post("/livros")
async def criar_livro(livro: LivroCreate, admin=Depends(get_current_admin)):
    try:
        if not livro.livro.livTitulo or not livro.livro.livAutor:
            raise HTTPException(status_code=400, detail="Título e autor são obrigatórios")

        payload = {
            "livTitulo": livro.livro.livTitulo,
            "livAutor": livro.livro.livAutor,
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
                # Se vier ISBN para o exemplar, verifica unicidade
                if ex.exeLivISBN:
                    existing = (
                        supabase.table("ExemplarLivro")
                        .select("*")
                        .eq("exeLivISBN", ex.exeLivISBN)
                        .execute()
                    )
                    if existing.data:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Este ISBN ({ex.exeLivISBN}) já está cadastrado em outro exemplar",
                        )

                ex_record = {
                    "idLivro": id_livro,
                    "exeLivTombo": ex.exeLivTombo,
                    "exeLivISBN": ex.exeLivISBN,
                    "exeLivStatus": ex.exeLivStatus or "Disponível",
                    "exeLivLocalizacao": ex.exeLivLocalizacao or livro.livLocalizacao,
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
async def listar_livros(user=Depends(get_optional_user)):
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
    payload = livro.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    updated = supabase.table("Livro").update(payload).eq("idLivro", idLivro).execute()
    return {"message": "Livro atualizado com sucesso!", "livro": updated.data[0]}


@app.delete("/livros/{idLivro}")
async def deletar_livro(idLivro: int, admin=Depends(get_current_admin)):
    supabase.table("ExemplarLivro").delete().eq("idLivro", idLivro).execute()
    supabase.table("Livro").delete().eq("idLivro", idLivro).execute()
    return {"message": "Livro e exemplares deletados com sucesso!"}


#  EXEMPLARES  #
@app.get("/exemplares/{idLivro}")
async def listar_exemplares(idLivro: int, user=Depends(get_current_user)):
    resp = supabase.table("ExemplarLivro").select("*").eq("idLivro", idLivro).order("exeLivTombo", {"ascending": True}).execute()
    return resp.data



@app.put("/exemplares/{idExemplar}")
async def atualizar_exemplar(idExemplar: int, data: ExemplarUpdate, admin=Depends(get_current_admin)):
    exist = supabase.table("ExemplarLivro").select("*").eq("idExemplar", idExemplar).execute()
    if not exist.data:
        raise HTTPException(status_code=404, detail="Exemplar não encontrado")

    payload = data.model_dump(exclude_none=True)

    # Se for atualizar ISBN, checar unicidade
    new_isbn = payload.get("exeLivISBN")
    if new_isbn:
        existing = (
            supabase.table("ExemplarLivro")
            .select("*")
            .eq("exeLivISBN", new_isbn)
            .neq("idExemplar", idExemplar)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=400,
                detail=f"Este ISBN ({new_isbn}) já está cadastrado em outro exemplar",
            )

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    updated = supabase.table("ExemplarLivro").update(payload).eq("idExemplar", idExemplar).execute()
    return {"message": "Exemplar atualizado", "exemplar": updated.data[0]}

#upload capa#
@app.post("/upload-capa")
async def upload_capa(file: UploadFile = File(...), admin=Depends(get_current_admin)):
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_bytes = await file.read()

    try:
        print("DEBUG CAPAS_BUCKET =", CAPAS_BUCKET)
        res = supabase.storage.from_(CAPAS_BUCKET).upload(filename, file_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar capa: {e}")

    if isinstance(res, dict) and res.get("error"):
        raise HTTPException(status_code=500, detail=str(res["error"]))

    public_url = supabase.storage.from_(CAPAS_BUCKET).get_public_url(filename)
    return {"url": public_url, "path": filename}
##aa

#categoria#
@app.get("/categorias")
async def listar_categorias(user=Depends(get_optional_user)):
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
async def listar_generos(user=Depends(get_optional_user)):
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


# ==== ADMINS ==== #
@app.get("/admins")
async def listar_admins(admin=Depends(get_current_admin)):
    """
    Lista administradores.
    """
    try:
        resp = supabase.table("Administrador").select("*").order("admNome").execute()
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar admins: {e}")


@app.post("/admins")
async def criar_admin(data: AdminIn, admin=Depends(get_current_admin)):
    """
    Cria um novo administrador com senha (hash bcrypt em admSenha).
    """
    try:
        if not data.senha or len(data.senha) < 6:
            raise HTTPException(status_code=400, detail="Senha deve ter pelo menos 6 caracteres")

        hashed_password = hash_password(data.senha)

        record = {
            "admNome": data.nome,
            "admEmail": data.email,
            "admStatus": parse_status(data.status),
            "admSenha": hashed_password,
        }
        resp = supabase.table("Administrador").insert(record).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Erro ao criar admin")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar admin: {e}")


@app.put("/admins/{idAdmin}")
async def atualizar_admin(idAdmin: int, data: AdminUpdate, admin=Depends(get_current_admin)):
    payload = {}
    if data.nome is not None:
        payload["admNome"] = data.nome
    if data.email is not None:
        payload["admEmail"] = data.email
    if data.status is not None:
        payload["admStatus"] = parse_status(data.status)
    if data.senha:
        payload["admSenha"] = hash_password(data.senha)


    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    try:
        resp = supabase.table("Administrador").update(payload).eq("idAdmin", idAdmin).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Admin não encontrado")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar admin: {e}")


@app.delete("/admins/{idAdmin}")
async def deletar_admin(idAdmin: int, admin=Depends(get_current_admin)):
    try:
        supabase.table("Administrador").delete().eq("idAdmin", idAdmin).execute()
        return {"message": "Admin removido com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar admin: {e}")
    

@app.get("/alunos")
async def listar_alunos(admin=Depends(get_current_admin)):
    try:
        resp = (
            supabase.table("Usuario")
            .select("*")
            .eq("usuTipo", "Aluno")
            .order("usuNome")
            .execute()
        )
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar alunos: {e}")


@app.post("/alunos")
async def criar_aluno(data: SignupData, admin=Depends(get_current_admin)):
    """
    Cria um usuário do tipo Aluno. Reaproveita estrutura do signup mas exige tipo=Aluno.
    """
    if data.tipo != "Aluno":
        raise HTTPException(status_code=400, detail="Tipo deve ser 'Aluno'")
    try:
        hashed_password = hash_password(data.senha)
        resp = supabase.table("Usuario").insert({
            "usuNome": data.nome,
            "usuEmail": data.email,
            "usuSenha": hashed_password,
            "usuTelefone": data.telefone,
            "usuTelefoneResponsavel": data.telefoneResponsavel,
            "usuEndereco": data.endereco,
            "usuCPF": data.cpf,
            "usuRA": data.ra,
            "usuTipo": "Aluno",
        }).execute()
        return resp.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar aluno: {e}")


@app.put("/alunos/{idUsuario}")
async def atualizar_aluno(idUsuario: int, data: UsuarioUpdate, admin=Depends(get_current_admin)):
    payload = {}
    if data.nome is not None:
        payload["usuNome"] = data.nome
    if data.email is not None:
        payload["usuEmail"] = data.email
    if data.telefone is not None:
        payload["usuTelefone"] = data.telefone
    if data.telefoneResponsavel is not None:
        payload["usuTelefoneResponsavel"] = data.telefoneResponsavel
    if data.endereco is not None:
        payload["usuEndereco"] = data.endereco
    if data.ra is not None:
        payload["usuRA"] = data.ra
    if data.cpf is not None:
        payload["usuCPF"] = data.cpf
    if data.tipo is not None:
        payload["usuTipo"] = data.tipo

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    try:
        resp = supabase.table("Usuario").update(payload).eq("idUsuario", idUsuario).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Aluno não encontrado")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar aluno: {e}")


@app.delete("/alunos/{idUsuario}")
async def deletar_aluno(idUsuario: int, admin=Depends(get_current_admin)):
    try:
        supabase.table("Usuario").delete().eq("idUsuario", idUsuario).execute()
        return {"message": "Aluno removido com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar aluno: {e}")


# ==== COMUNIDADE ==== #
@app.get("/comunidade")
async def listar_comunidade(admin=Depends(get_current_admin)):
    try:
        resp = (
            supabase.table("Usuario")
            .select("*")
            .eq("usuTipo", "Comunidade")
            .order("usuNome")
            .execute()
        )
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar comunidade: {e}")


@app.post("/comunidade")
async def criar_comunidade(data: SignupData, admin=Depends(get_current_admin)):
    if data.tipo != "Comunidade":
        raise HTTPException(status_code=400, detail="Tipo deve ser 'Comunidade'")
    try:
        hashed_password = hash_password(data.senha)
        resp = supabase.table("Usuario").insert({
            "usuNome": data.nome,
            "usuEmail": data.email,
            "usuSenha": hashed_password,
            "usuTelefone": data.telefone,
            "usuTelefoneResponsavel": data.telefoneResponsavel,
            "usuEndereco": data.endereco,
            "usuCPF": data.cpf,
            "usuRA": data.ra,
            "usuTipo": "Comunidade",
        }).execute()
        return resp.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar membro da comunidade: {e}")


@app.put("/comunidade/{idUsuario}")
async def atualizar_comunidade(idUsuario: int, data: UsuarioUpdate, admin=Depends(get_current_admin)):
    # mesmo payload do aluno
    return await atualizar_aluno(idUsuario, data, admin)


@app.delete("/comunidade/{idUsuario}")
async def deletar_comunidade(idUsuario: int, admin=Depends(get_current_admin)):
    return await deletar_aluno(idUsuario, admin)


@app.get("/dashboard-stats")
async def dashboard_stats(user=Depends(get_optional_user)):
    """
    Retorna contadores básicos para o dashboard.
    Permite acesso mesmo sem autenticação (get_optional_user).
    """
    try:
        # Livros
        livros_resp = supabase.table("Livro").select("idLivro").execute()
        total_livros = len(livros_resp.data or [])

        # Usuários
        usuarios_resp = supabase.table("Usuario").select("idUsuario").execute()
        total_usuarios = len(usuarios_resp.data or [])
       # Empréstimos ativos (ajuste nome da tabela/campos conforme seu schema)
        try:
            emprestimos_resp = (
                supabase.table("Emprestimo")
                .select("idEmprestimo")
                .eq("empStatus", "Ativo")
                .execute()
            )
            emprestimos_ativos = len(emprestimos_resp.data or [])
        except Exception:
            emprestimos_ativos = 0

        # Devoluções pendentes (ajuste conforme sua modelagem)
        try:
            pendentes_resp = (
                supabase.table("Emprestimo")
                .select("idEmprestimo")
                .eq("empStatus", "Pendente")
                .execute()
            )
            devolucoes_pendentes = len(pendentes_resp.data or [])
        except Exception:
            devolucoes_pendentes = 0

        return {
            "totalLivros": total_livros,
            "totalUsuarios": total_usuarios,
            "emprestimosAtivos": emprestimos_ativos,
            "devolucoesPendentes": devolucoes_pendentes,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao carregar estatísticas: {str(e)}")