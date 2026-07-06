from typing import Optional, Union

from pydantic import BaseModel, EmailStr, Field


class Login(BaseModel):
    email: EmailStr
    senha: str
    UserType: str


class Signup(BaseModel):
    nome: str = Field(min_length=1)
    email: EmailStr
    senha: str = Field(min_length=8)
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
    # Campos sugeridos pela IA de catalogação (colunas simples de Livro)
    livSubtitulo: Optional[str] = None
    livIdioma: Optional[str] = None
    livFaixaEtaria: Optional[str] = None
    livPalavrasChave: Optional[str] = None
    # Novos campos de catalogação
    livCDD: Optional[str] = None
    livCDDSugerida: Optional[bool] = False
    livEdicao: Optional[int] = None
    livAlturaCm: Optional[float] = None
    livLarguraCm: Optional[float] = None
    livIlustrado: Optional[bool] = False
    # Dados da Editora informados via formulário
    ediCidade: Optional[str] = None
    ediEstado: Optional[str] = None
    ediPais: Optional[str] = "Brasil"
    # Campos relacionais — não são colunas de Livro, tratados no router
    livAutor: Optional[str] = None       # → tabela Autor + LivroAutor
    autorAnoNascimento: Optional[int] = None  # → coluna Autor.autAnoNascimento
    autorAnoFalecimento: Optional[int] = None # → coluna Autor.autAnoFalecimento
    livEditora: Optional[str] = None     # → tabela Editora (FK idEditora)
    idCategoria: Optional[int] = None   # → tabela LivroCategoria
    idGenero: Optional[int] = None      # → tabela LivroGenero
    exemplarISBN: Optional[str] = None  # → Exemplar (não em Livro)
    
class FichaCatalograficaResponse(BaseModel):
    fichaTexto: str
    fichaHtml: Optional[str] = None
    fichaJson: dict
    geradaPorIA: bool
    classificacaoSugerida: bool


class FichaCatalograficaUpdate(BaseModel):
    ficTexto: str
    ficCDD: Optional[str] = None
    ficGeradaPorIA: Optional[bool] = False
    ficRevisada: Optional[bool] = True



class Autor(BaseModel):
    autNome: str
    autABNT: Optional[str] = None
    autAnoNascimento: Optional[int] = None
    autAnoFalecimento: Optional[int] = None


class AutorUpdate(BaseModel):
    autNome: Optional[str] = None
    autABNT: Optional[str] = None
    autAnoNascimento: Optional[int] = None
    autAnoFalecimento: Optional[int] = None

class LivroCreate(BaseModel):
    livro: Livro
    quantidade_exemplares: int
    prefixo_tombo: str = "T"


class LivroStatusUpdate(BaseModel):
    ativo: bool


class CompletarIARequest(BaseModel):
    isbn: Optional[str] = None
    livTitulo: Optional[str] = None
    livAutor: Optional[str] = None
    livEditora: Optional[str] = None
    livAnoPublicacao: Optional[int] = None
    livPaginas: Optional[int] = None
    livDescricao: Optional[str] = None
    categoriaNome: Optional[str] = None
    generoNome: Optional[str] = None
    categorias_existentes: Optional[list[str]] = None
    generos_existentes: Optional[list[str]] = None

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
    nome: str = Field(min_length=1)
    email: EmailStr
    senha: str = Field(min_length=8)
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
    email: Optional[EmailStr] = None
    senha: Optional[str] = Field(default=None, min_length=8)
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
    nome: str = Field(min_length=1)
    email: EmailStr
    senha: str = Field(min_length=8)
    status: Optional[Union[bool, str]] = "Ativo"


class AdminUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    senha: Optional[str] = Field(default=None, min_length=8)
    status: Optional[Union[bool, str]] = None