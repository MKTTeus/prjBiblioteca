import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, Union

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
    livISBN: Optional[str] = None
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

class ExemplarUpdate(BaseModel):
    exeLivTombo: Optional[str] = None
    exeLivStatus: Optional[str] = None
    exeLivISBN: Optional[str] = None
    exeLivDescricao: Optional[str] = None
# ========================
# AUTH HELPERS
# ========================
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
    email = normalize_email(data.email)

    # Verifica admins
    admin_resp = supabase.table("Administrador").select("*").eq("admEmail", email).execute()
    if admin_resp.data:
        a = admin_resp.data[0]
        if verify_password(data.senha, a["admSenha"]):
            token = create_token({"sub": a["admEmail"], "tipo": "admin"})
            return {"access_token": token, "tipo": "admin", "nome": a["admNome"]}

    # Verifica usuários comuns
    user_resp = supabase.table("Usuario").select("*").eq("usuEmail", email).execute()
    if user_resp.data:
        u = user_resp.data[0]
        if verify_password(data.senha, u["usuSenha"]):
            token = create_token({"sub": u["usuEmail"], "tipo": "usuario"})
            return {"access_token": token, "tipo": "usuario", "nome": u["usuNome"]}

    raise HTTPException(status_code=400, detail="Email ou senha inválidos")


class Signup(BaseModel):
    nome: str
    email: str
    senha: str
    telefone: str
    endereco: str
    telefoneResponsavel: Optional[str] = None
    ra: Optional[str] = None
    cpf: Optional[str] = None
    tipo: str


@app.post("/signup")
def signup(data: Signup):
    if data.tipo not in ["Aluno", "Comunidade"]:
        raise HTTPException(status_code=400, detail="Tipo inválido")

    email = normalize_email(data.email)

    # Verifica duplicidade em todas as tabelas de contas
    email_existe_admin = supabase.table("Administrador").select("*").eq("admEmail", email).execute()
    email_existe_usuario = supabase.table("Usuario").select("*").eq("usuEmail", email).execute()
    if email_existe_admin.data or email_existe_usuario.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    novo_usuario = {
        "usuNome": data.nome,
        "usuEmail": email,
        "usuSenha": hash_password(data.senha),
        "usuTelefone": data.telefone,
        "usuTelefoneResponsavel": data.telefoneResponsavel,
        "usuEndereco": data.endereco,
        "usuRA": data.ra,
        "usuCPF": data.cpf,
        "usuTipo": data.tipo,
        "usuStatus": True
    }
    supabase.table("Usuario").insert(novo_usuario).execute()

    return {"message": "Conta criada com sucesso"}
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

    # verifica se livro existe e pega ISBN para repassar aos exemplares
    livro_resp = supabase.table("Livro").select("idLivro, livISBN").eq("idLivro", idLivro).execute()

    if not livro_resp.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    livro = livro_resp.data[0]
    isbn_padrao = livro.get("livISBN")

    tombos = gerar_tombos(quantidade, prefixo)

    exemplares = []

    for t in tombos:
        ex_data = {
            "idLivro": idLivro,
            "exeLivTombo": t,
            "exeLivStatus": "Disponível"
        }

        if isbn_padrao:
            ex_data["exeLivISBN"] = isbn_padrao

        ex = supabase.table("ExemplarLivro").insert(ex_data).execute()

        exemplares.append(ex.data[0])

    return {
        "message": f"{quantidade} exemplares adicionados",
        "exemplares": exemplares
    }

@app.get("/livros")
def listar_livros(
    q: Optional[str] = None,
    categoria: Optional[str] = "todas",
    status: Optional[str] = "todos",
    page: int = 1,
    per_page: int = 100
):
    try:
        allowed_ids = None

        if q:
            q_str = f"%{q}%"

            livros_titulo = supabase.table("Livro").select("idLivro").ilike("livTitulo", q_str).execute()
            livros_autor = supabase.table("Livro").select("idLivro").ilike("livAutor", q_str).execute()

            ids = set()

            if livros_titulo.data:
                ids.update([l["idLivro"] for l in livros_titulo.data])
            if livros_autor.data:
                ids.update([l["idLivro"] for l in livros_autor.data])

            exemplares_tombo = supabase.table("ExemplarLivro").select("idLivro").ilike("exeLivTombo", q_str).execute()

            if exemplares_tombo.data:
                ids.update([e["idLivro"] for e in exemplares_tombo.data])

            allowed_ids = ids if ids else set()

        if categoria and categoria != "todas":
            try:
                cat_id = int(categoria)
                cats = supabase.table("Livro").select("idLivro").eq("idCategoria", cat_id).execute()

                cat_ids = set([c["idLivro"] for c in (cats.data or [])])

                if allowed_ids is None:
                    allowed_ids = cat_ids
                else:
                    allowed_ids = allowed_ids.intersection(cat_ids)

            except:
                pass

        if status and status.lower() != "todos":
            mapa = {
                "disponivel": "Disponível",
                "emprestado": "Emprestado",
                "reservado": "Reservado"
            }

            cond = mapa.get(status.lower())

            if cond:
                resp = supabase.table("ExemplarLivro").select("idLivro").ilike("exeLivStatus", f"%{cond}%").execute()

                status_ids = set([e["idLivro"] for e in (resp.data or [])])

                if allowed_ids is None:
                    allowed_ids = status_ids
                else:
                    allowed_ids = allowed_ids.intersection(status_ids)

        if isinstance(allowed_ids, set) and len(allowed_ids) == 0:
            return []

        query = supabase.table("Livro").select("*")

        if isinstance(allowed_ids, set):
            query = query.in_("idLivro", list(allowed_ids))

        start = (page - 1) * per_page
        end = start + per_page - 1

        livros = query.range(start, end).execute().data or []


        livro_ids = [l["idLivro"] for l in livros]

        exemplares = []
        if livro_ids:
            exemplares = supabase.table("ExemplarLivro").select("*").in_("idLivro", livro_ids).execute().data or []


        mapa_exemplares = {}

        for ex in exemplares:
            id_livro = ex["idLivro"]

            if id_livro not in mapa_exemplares:
                mapa_exemplares[id_livro] = {
                    "total": 0,
                    "disponiveis": 0,
                    "emprestados": 0,
                    "reservados": 0
                }

            mapa_exemplares[id_livro]["total"] += 1

            status_ex = (ex.get("exeLivStatus") or "").lower()

            if "dispon" in status_ex:
                mapa_exemplares[id_livro]["disponiveis"] += 1
            elif "emprest" in status_ex:
                mapa_exemplares[id_livro]["emprestados"] += 1
            elif "reserv" in status_ex:
                mapa_exemplares[id_livro]["reservados"] += 1

        resultado = []

        for livro in livros:
            stats = mapa_exemplares.get(livro["idLivro"], {
                "total": 0,
                "disponiveis": 0,
                "emprestados": 0,
                "reservados": 0
            })

            resultado.append({
                **livro,
                "total_exemplares": stats["total"],
                "disponiveis": stats["disponiveis"],
                "emprestados": stats["emprestados"],
                "reservados": stats["reservados"],
            })

        return resultado

    except Exception as e:
        print("ERRO:", e)
        raise HTTPException(status_code=500, detail="Erro ao listar livros")

@app.get("/livros/{idLivro}")
def detalhes_livro(idLivro: int):
    livro_resp = supabase.table("Livro").select("*").eq("idLivro", idLivro).execute()
    exemplares_resp = supabase.table("ExemplarLivro").select("*").eq("idLivro", idLivro).execute()
    if not livro_resp.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    livro = livro_resp.data[0]
    llib_isbn = livro.get("livISBN")

    # Garante ISBN em cada exemplar se o livro tiver ISBN
    if llib_isbn:
        for ex in exemplares_resp.data:
            if not ex.get("exeLivISBN"):
                supabase.table("ExemplarLivro").update({"exeLivISBN": llib_isbn}).eq("idExemplar", ex.get("idExemplar")).execute()
                ex["exeLivISBN"] = llib_isbn

    return {"livro": livro, "exemplares": exemplares_resp.data}

@app.post("/livros")
def criar_livro(data: LivroCreate, admin=Depends(get_admin)):
    livro_resp = supabase.table("Livro").insert(data.livro.model_dump()).execute()
    id_livro = livro_resp.data[0]["idLivro"]
    isbn_padrao = (data.livro.livISBN or "").strip() or None

    tombos = gerar_tombos(data.quantidade_exemplares, data.prefixo_tombo)
    exemplares = []
    for t in tombos:
        ex_data = {
            "idLivro": id_livro,
            "exeLivTombo": t,
            "exeLivStatus": "Disponível"
        }

        if isbn_padrao:
            ex_data["exeLivISBN"] = isbn_padrao

        ex = supabase.table("ExemplarLivro").insert(ex_data).execute()
        exemplares.append(ex.data[0])
    return {"livro": livro_resp.data[0], "exemplares": exemplares}

@app.put("/livros/{idLivro}")
def atualizar_livro(idLivro: int, livro: Livro, admin=Depends(get_admin)):
    resp = supabase.table("Livro").update(livro.model_dump()).eq("idLivro", idLivro).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    # Atualiza ISBN dos exemplares existentes se o livro tiver ISBN definido
    if livro.livISBN:
        supabase.table("ExemplarLivro").update({"exeLivISBN": livro.livISBN}).eq("idLivro", idLivro).execute()

    return resp.data[0]

@app.delete("/livros/{idLivro}")
def deletar_livro(idLivro: int, admin=Depends(get_admin)):
    supabase.table("ExemplarLivro").delete().eq("idLivro", idLivro).execute()
    supabase.table("Livro").delete().eq("idLivro", idLivro).execute()
    return {"message": "Livro removido"}


@app.put("/exemplares/{idExemplar}")
def atualizar_exemplar(idExemplar: int, data: ExemplarUpdate, admin=Depends(get_admin)):
    print("DATA RECEBIDA:", data.dict())
    resp = supabase.table("ExemplarLivro").select("*").eq("idExemplar", idExemplar).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Exemplar não encontrado")

    payload = {}
    if data.exeLivTombo is not None:
        payload["exeLivTombo"] = data.exeLivTombo
    if data.exeLivStatus is not None:
        payload["exeLivStatus"] = data.exeLivStatus
    if data.exeLivISBN is not None:
        payload["exeLivISBN"] = data.exeLivISBN
    if data.exeLivDescricao is not None:
        payload["exeLivDescricao"] = data.exeLivDescricao

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    atual = supabase.table("ExemplarLivro").update(payload).eq("idExemplar", idExemplar).execute()
    return atual.data[0]

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
# MODELS ADICIONAIS
# ========================

class UsuarioCreate(BaseModel):
    nome: str
    email: str
    senha: str
    telefone: Optional[str] = None
    telefoneResponsavel: Optional[str] = None
    endereco: Optional[str] = None
    ra: Optional[str] = None
    cpf: Optional[str] = None
    tipo: Optional[str] = "Aluno"
    status: Optional[Union[bool, str]] = "Ativo"

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    senha: Optional[str] = None
    telefone: Optional[str] = None
    telefoneResponsavel: Optional[str] = None
    endereco: Optional[str] = None
    ra: Optional[str] = None
    cpf: Optional[str] = None
    status: Optional[Union[bool, str]] = None

class AdminCreate(BaseModel):
    nome: str
    email: str
    senha: str
    status: Optional[Union[bool, str]] = "Ativo"

class AdminUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    senha: Optional[str] = None
    status: Optional[Union[bool, str]] = None



# ========================
# ADMIN
# ========================
@app.get("/admins")
def listar_admins(admin=Depends(get_admin)):
    resp = supabase.table("Administrador").select("*").order("admNome").execute()
    return resp.data or []

@app.post("/admins")
def criar_admin(data: AdminCreate, admin=Depends(get_admin)):
    email = normalize_email(data.email)

    email_existe_usuario = supabase.table("Usuario").select("*").eq("usuEmail", email).execute()
    if email_existe_usuario.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado como usuário")

    exist = supabase.table("Administrador").select("*").eq("admEmail", email).execute()
    if exist.data:
        raise HTTPException(status_code=400, detail="Admin já existe")
    hash_senha = hash_password(data.senha)
    criado = supabase.table("Administrador").insert({
        "admNome": data.nome,
        "admEmail": email,
        "admSenha": hash_senha,
        "admStatus": parse_status(data.status)
    }).execute()
    return criado.data[0]

@app.put("/admins/{idAdmin}")
def atualizar_admin(idAdmin: int, data: AdminUpdate, admin=Depends(get_admin)):
    resp = supabase.table("Administrador").select("*").eq("idAdmin", idAdmin).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Admin não encontrado")

    payload = {}
    if data.nome is not None:
        payload["admNome"] = data.nome
    if data.email is not None:
        payload["admEmail"] = normalize_email(data.email)
    if data.senha is not None:
        payload["admSenha"] = hash_password(data.senha)
    if data.status is not None:
        payload["admStatus"] = parse_status(data.status)

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    resp = supabase.table("Administrador").update(payload).eq("idAdmin", idAdmin).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Admin não encontrado")
    return resp.data[0]

@app.delete("/admins/{idAdmin}")
def deletar_admin(idAdmin: int, admin=Depends(get_admin)):
    supabase.table("Administrador").delete().eq("idAdmin", idAdmin).execute()
    return {"message": "Admin removido"}


# ========================
# ALUNOS / COMUNIDADE
# ========================
@app.get("/alunos")
def listar_alunos(admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("usuTipo", "Aluno").order("usuNome").execute()
    return resp.data or []

@app.post("/alunos")
def criar_aluno(data: UsuarioCreate, admin=Depends(get_admin)):
    email = normalize_email(data.email)

    email_existe_admin = supabase.table("Administrador").select("*").eq("admEmail", email).execute()
    if email_existe_admin.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado como administrador")

    exist = supabase.table("Usuario").select("*").eq("usuEmail", email).execute()
    if exist.data:
        raise HTTPException(status_code=400, detail="Aluno já existe")

    novo = {
        "usuNome": data.nome,
        "usuEmail": email,
        "usuSenha": hash_password(data.senha),
        "usuTelefone": data.telefone,
        "usuTelefoneResponsavel": data.telefoneResponsavel,
        "usuEndereco": data.endereco,
        "usuRA": data.ra,
        "usuTipo": "Aluno",
        "usuStatus": parse_status(data.status)
    }
    criado = supabase.table("Usuario").insert(novo).execute()
    return criado.data[0]

@app.put("/alunos/{idUsuario}")
def atualizar_aluno(idUsuario: int, data: UsuarioUpdate, admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("idUsuario", idUsuario).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    payload = {}
    if data.nome is not None:
        payload["usuNome"] = data.nome
    if data.email is not None:
        payload["usuEmail"] = normalize_email(data.email)
    if data.senha is not None:
        payload["usuSenha"] = hash_password(data.senha)
    if data.telefone is not None:
        payload["usuTelefone"] = data.telefone
    if data.telefoneResponsavel is not None:
        payload["usuTelefoneResponsavel"] = data.telefoneResponsavel
    if data.endereco is not None:
        payload["usuEndereco"] = data.endereco
    if data.ra is not None:
        payload["usuRA"] = data.ra
    if data.status is not None:
        payload["usuStatus"] = parse_status(data.status)

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    atual = supabase.table("Usuario").update(payload).eq("idUsuario", idUsuario).execute()
    return atual.data[0]

@app.delete("/alunos/{idUsuario}")
def deletar_aluno(idUsuario: int, admin=Depends(get_admin)):
    supabase.table("Usuario").delete().eq("idUsuario", idUsuario).execute()
    return {"message": "Aluno removido"}


@app.get("/comunidade")
def listar_comunidade(admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("usuTipo", "Comunidade").order("usuNome").execute()
    return resp.data or []

@app.post("/comunidade")
def criar_comunidade(data: UsuarioCreate, admin=Depends(get_admin)):
    email_existe_admin = supabase.table("Administrador").select("*").eq("admEmail", data.email).execute()
    if email_existe_admin.data:
        raise HTTPException(status_code=400, detail="Email já cadastrado como administrador")

    exist = supabase.table("Usuario").select("*").eq("usuEmail", data.email).execute()
    if exist.data:
        raise HTTPException(status_code=400, detail="Membro já existe")

    novo = {
        "usuNome": data.nome,
        "usuEmail": data.email,
        "usuSenha": hash_password(data.senha),
        "usuTelefone": data.telefone,
        "usuTelefoneResponsavel": data.telefoneResponsavel,
        "usuEndereco": data.endereco,
        "usuCPF": data.cpf,
        "usuTipo": "Comunidade",
        "usuStatus": parse_status(data.status)
    }
    criado = supabase.table("Usuario").insert(novo).execute()
    return criado.data[0]

@app.put("/comunidade/{idUsuario}")
def atualizar_comunidade(idUsuario: int, data: UsuarioUpdate, admin=Depends(get_admin)):
    resp = supabase.table("Usuario").select("*").eq("idUsuario", idUsuario).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Membro não encontrado")

    payload = {}
    if data.nome is not None:
        payload["usuNome"] = data.nome
    if data.email is not None:
        payload["usuEmail"] = normalize_email(data.email)
    if data.senha is not None:
        payload["usuSenha"] = hash_password(data.senha)
    if data.telefone is not None:
        payload["usuTelefone"] = data.telefone
    if data.telefoneResponsavel is not None:
        payload["usuTelefoneResponsavel"] = data.telefoneResponsavel
    if data.endereco is not None:
        payload["usuEndereco"] = data.endereco
    if data.cpf is not None:
        payload["usuCPF"] = data.cpf
    if data.status is not None:
        payload["usuStatus"] = parse_status(data.status)

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    atual = supabase.table("Usuario").update(payload).eq("idUsuario", idUsuario).execute()
    return atual.data[0]

@app.delete("/comunidade/{idUsuario}")
def deletar_comunidade(idUsuario: int, admin=Depends(get_admin)):
    supabase.table("Usuario").delete().eq("idUsuario", idUsuario).execute()
    return {"message": "Membro removido"}

# ========================
# DASHBOARD
# ========================
@app.get("/dashboard-stats")
def dashboard_stats(user=Depends(get_optional_user)):
    try:
        hoje = datetime.utcnow().date()

        livros = supabase.table("Livro").select("idLivro").execute().data or []
        usuarios = supabase.table("Usuario").select("idUsuario").execute().data or []

        emprestimos = supabase.table("EmprestimoLivro").select("*").execute().data or []

        ativos = 0
        pendentes = 0
        atrasados = 0
        devolvidos_hoje = 0
        reservados = 0

        for emp in emprestimos:
            status = (emp.get("empLiv_Status") or "").lower()

            data_devolucao = emp.get("empLiv_DataPrevistaDevolucao")
            data_entrega = emp.get("empLiv_DataDevolucao")

            # EMPRÉSTIMOS ATIVOS
            if "ativo" in status:
                ativos += 1

                # ATRASADOS
                if data_devolucao:
                    try:
                        data_dev = datetime.fromisoformat(data_devolucao).date()
                        if data_dev < hoje:
                            atrasados += 1
                    except:
                        pass

            # PENDENTES
            if status == "pendente":
                pendentes += 1

            # DEVOLVIDOS HOJE
            if data_entrega:
                try:
                    data_ent = datetime.fromisoformat(data_entrega).date()
                    if data_ent == hoje:
                        devolvidos_hoje += 1
                except:
                    pass

            # RESERVADOS
            if status == "reservado":
                reservados += 1

    except Exception as e:
        print("Erro dashboard:", e)
        return {
            "totalLivros": 0,
            "totalUsuarios": 0,
            "emprestimosAtivos": 0,
            "devolucoesPendentes": 0,
            "reservados": 0,
            "atrasados": 0,
            "devolucoesHoje": 0
        }

    return {
        "totalLivros": len(livros),
        "totalUsuarios": len(usuarios),
        "emprestimosAtivos": ativos,
        "devolucoesPendentes": pendentes,
        "reservados": reservados,
        "atrasados": atrasados,
        "devolucoesHoje": devolvidos_hoje
    }