from typing import Optional, Union

from pydantic import BaseModel


class Login(BaseModel):
    email: str
    senha: str


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
    livAutor: str
    livDescricao: Optional[str] = None
    livEditora: Optional[str] = None
    livAnoPublicacao: Optional[str] = None
    livPaginas: Optional[int] = None
    livCapaURL: Optional[str] = None
    exemplarISBN: Optional[str] = None
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
