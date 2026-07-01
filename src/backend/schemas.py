from typing import Optional, Union

from pydantic import BaseModel


class Login(BaseModel):
    email: str
    senha: str
    UserType: str


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


class Livro(BaseModel):
    livTitulo: str
    livDescricao: Optional[str] = None
    livAnoPublicacao: Optional[int] = None
    livPaginas: Optional[int] = None
    livCapaURL: Optional[str] = None
    livISBN: Optional[str] = None
    # Campos relacionais — não são colunas de Livro, tratados no router
    livAutor: Optional[str] = None       # → tabela Autor + LivroAutor
    livEditora: Optional[str] = None     # → tabela Editora (FK idEditora)
    idCategoria: Optional[int] = None   # → tabela LivroCategoria
    idGenero: Optional[int] = None      # → tabela LivroGenero
    exemplarISBN: Optional[str] = None  # → Exemplar (não em Livro)


class LivroCreate(BaseModel):
    livro: Livro
    quantidade_exemplares: int
    prefixo_tombo: str = "T"


class EmprestimoSolicitacao(BaseModel):
    idExemplar: int

class Emprestimo(BaseModel):
    idUsuario: int
    idExemplar: int


class Categoria(BaseModel):
    catNome: str


class Configuracao(BaseModel):
    chave: str
    valor: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    ativo: Optional[Union[bool, str]] = True


class Genero(BaseModel):
    genNome: str


class ExemplarUpdate(BaseModel):
    exeLivTombo: Optional[str] = None
    exeLivStatus: Optional[str] = None
    exeLivDescricao: Optional[str] = None


class UsuarioCreate(BaseModel):
    nome: str
    email: str
    senha: str
    telefone: Optional[str] = None
    telefoneResponsavel: Optional[str] = None
    endereco: Optional[str] = None
    ra: Optional[str] = None
    cpf: Optional[str] = None
    serie: Optional[str] = None
    turma: Optional[str] = None
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
    serie: Optional[str] = None
    turma: Optional[str] = None
    status: Optional[Union[bool, str]] = None


class EncerrarAnoLetivo(BaseModel):
    senha: str
    confirmacao: str


class BatchIds(BaseModel):
    ids: list[int]

class BatchStatus(BaseModel):
    ids: list[int]
    status: bool

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
