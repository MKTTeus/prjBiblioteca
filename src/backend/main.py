import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel
from supabase import create_client
from dotenv import load_dotenv

# ========================
# CONFIGURAÇÃO
# ========================
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SECRET_KEY = os.getenv("SECRET_KEY", "segredo")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 6

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================
# MODELS
# ========================
class Login(BaseModel):
    email: str
    senha: str

class Livro(BaseModel):
    livTitulo: str
    livAutor: str
    livDescricao: Optional[str] = None
    livEditora: Optional[str] = None
    livAnoPublicacao: Optional[str] = None
    livPaginas: Optional[int] = None
    livCapaURL: Optional[str] = None
    idCategoria: int = 1
    idGenero: int = 1

class LivroCreate(BaseModel):
    livro: Livro
    quantidade_exemplares: int
    prefixo_tombo: str = "T"

class Emprestimo(BaseModel):
    idUsuario: int
    idExemplar: int

class Categoria(BaseModel):
    catNome: str

class Genero(BaseModel):
    genNome: str

# ========================
# AUTH HELPERS
# ========================
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict, expires_hours: int = ACCESS_TOKEN_EXPIRE_HOURS) -> str:
    expire = datetime.utcnow() + timedelta(hours=expires_hours)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

# ========================
# DEPENDÊNCIAS
# ========================
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

# ========================
# LOGIN
# ========================
@app.post("/login")
def login(data: Login):
    # Verifica admins
    admin_resp = supabase.table("Administrador").select("*").eq("admEmail", data.email).execute()
    if admin_resp.data:
        a = admin_resp.data[0]
        if verify_password(data.senha, a["admSenha"]):
            token = create_token({"sub": a["admEmail"], "tipo": "admin"})
            return {"access_token": token, "tipo": "admin", "nome": a["admNome"]}

    # Verifica usuários comuns
    user_resp = supabase.table("Usuario").select("*").eq("usuEmail", data.email).execute()
    if user_resp.data:
        u = user_resp.data[0]
        if verify_password(data.senha, u["usuSenha"]):
            token = create_token({"sub": u["usuEmail"], "tipo": "usuario"})
            return {"access_token": token, "tipo": "usuario", "nome": u["usuNome"]}

    raise HTTPException(status_code=400, detail="Email ou senha inválidos")

# ========================
# LIVROS
# ========================
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

@app.post("/livros/{idLivro}/adicionar-exemplares")
def adicionar_exemplares(
    idLivro: int,
    quantidade: int,
    prefixo: str = "T",
    admin=Depends(get_admin)
):

    # verifica se livro existe
    livro = supabase.table("Livro").select("idLivro").eq("idLivro", idLivro).execute()

    if not livro.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    tombos = gerar_tombos(quantidade, prefixo)

    exemplares = []

    for t in tombos:
        ex = supabase.table("ExemplarLivro").insert({
            "idLivro": idLivro,
            "exeLivTombo": t,
            "exeLivStatus": "Disponível"
        }).execute()

        exemplares.append(ex.data[0])

    return {
        "message": f"{quantidade} exemplares adicionados",
        "exemplares": exemplares
    }

@app.get("/livros")
def listar_livros():

    livros_resp = supabase.table("Livro").select("*").execute()
    exemplares_resp = supabase.table("ExemplarLivro").select("*").execute()

    livros = livros_resp.data or []
    exemplares = exemplares_resp.data or []

    # agrupar exemplares por livro
    mapa_exemplares = {}

    for ex in exemplares:
        id_livro = ex["idLivro"]

        if id_livro not in mapa_exemplares:
            mapa_exemplares[id_livro] = {
                "total": 0,
                "disponiveis": 0,
                "emprestados": 0
            }

        mapa_exemplares[id_livro]["total"] += 1

        if ex["exeLivStatus"] == "Disponível":
            mapa_exemplares[id_livro]["disponiveis"] += 1
        else:
            mapa_exemplares[id_livro]["emprestados"] += 1

    resultado = []

    for livro in livros:

        stats = mapa_exemplares.get(livro["idLivro"], {
            "total": 0,
            "disponiveis": 0,
            "emprestados": 0
        })

        resultado.append({
            **livro,
            "total_exemplares": stats["total"],
            "disponiveis": stats["disponiveis"],
            "emprestados": stats["emprestados"]
        })

    return resultado



@app.get("/livros/{idLivro}")
def detalhes_livro(idLivro: int):
    livro_resp = supabase.table("Livro").select("*").eq("idLivro", idLivro).execute()
    exemplares_resp = supabase.table("ExemplarLivro").select("*").eq("idLivro", idLivro).execute()
    if not livro_resp.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    return {"livro": livro_resp.data[0], "exemplares": exemplares_resp.data}

@app.post("/livros")
def criar_livro(data: LivroCreate, admin=Depends(get_admin)):
    livro_resp = supabase.table("Livro").insert(data.livro.model_dump()).execute()
    id_livro = livro_resp.data[0]["idLivro"]
    tombos = gerar_tombos(data.quantidade_exemplares, data.prefixo_tombo)
    exemplares = []
    for t in tombos:
        ex = supabase.table("ExemplarLivro").insert({
            "idLivro": id_livro,
            "exeLivTombo": t,
            "exeLivStatus": "Disponível"
        }).execute()
        exemplares.append(ex.data[0])
    return {"livro": livro_resp.data[0], "exemplares": exemplares}

@app.put("/livros/{idLivro}")
def atualizar_livro(idLivro: int, livro: Livro, admin=Depends(get_admin)):
    resp = supabase.table("Livro").update(livro.model_dump()).eq("idLivro", idLivro).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    return resp.data[0]

@app.delete("/livros/{idLivro}")
def deletar_livro(idLivro: int, admin=Depends(get_admin)):
    supabase.table("ExemplarLivro").delete().eq("idLivro", idLivro).execute()
    supabase.table("Livro").delete().eq("idLivro", idLivro).execute()
    return {"message": "Livro removido"}

# ========================
# CATEGORIAS & GENEROS
# ========================
@app.get("/categorias")
def listar_categorias():
    try:
        res = supabase.table("CategoriaLivro").select("*").execute()
        return res.data or []
    except Exception as e:
        print("Erro categorias:", e)
        return []
@app.post("/categorias")
def criar_categoria(cat: Categoria, admin=Depends(get_admin)):
    res = supabase.table("CategoriaLivro").insert(cat.dict()).execute()
    return res.data[0]

@app.get("/generos")
def listar_generos():
    try:
        res = supabase.table("GeneroLivro").select("*").execute()
        return res.data or []
    except Exception as e:
        print("Erro generos:", e)
        return []
@app.post("/generos")
def criar_genero(gen: Genero, admin=Depends(get_admin)):
    res = supabase.table("GeneroLivro").insert(gen.dict()).execute()
    return res.data[0]

# ========================
# ADMIN
# ========================
@app.get("/admins")
def listar_admins(admin=Depends(get_admin)):
    resp = supabase.table("Administrador").select("*").order("admNome").execute()
    return resp.data or []

# Criação, atualização e deleção de admins seriam implementadas aqui
# ========================
# ALUNOS / COMUNIDADE
# ========================
@app.get("/alunos")
def listar_alunos(admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("usuTipo", "Aluno").order("usuNome").execute()
    return resp.data or []

@app.get("/comunidade")
def listar_comunidade(admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("usuTipo", "Comunidade").order("usuNome").execute()
    return resp.data or []

# ========================
# DASHBOARD
# ========================
@app.get("/dashboard-stats")
def dashboard_stats(user=Depends(get_optional_user)):

    try:
        livros_resp = supabase.table("Livro").select("idLivro").execute()
        usuarios_resp = supabase.table("Usuario").select("idUsuario").execute()
        emprestimos_resp = supabase.table("EmprestimoLivro").select("idEmprestimo").eq("empLiv_Status", "Ativo").execute()
        devolucoes_resp = supabase.table("EmprestimoLivro").select("idEmprestimo").eq("empLiv_Status", "Pendente").execute()

        livros = livros_resp.data or []
        usuarios = usuarios_resp.data or []
        emprestimos = emprestimos_resp.data or []
        devolucoes = devolucoes_resp.data or []


    except Exception as e:
        print("Erro dashboard:", e)

        livros = []
        usuarios = []
        emprestimos = []
        devolucoes = []

    return {
        "totalLivros": len(livros),
        "totalUsuarios": len(usuarios),
        "emprestimosAtivos": len(emprestimos),
        "devolucoesPendentes": len(devolucoes)
    }