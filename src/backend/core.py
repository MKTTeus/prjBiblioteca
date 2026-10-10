import os
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import bcrypt
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
if os.getenv('VERCEL') and (len(SECRET_KEY)<32 or SECRET_KEY.startswith('replace-')):
    raise RuntimeError('SECRET_KEY deve ser um segredo forte e exclusivo no ambiente de produção')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 6

def get_session_epoch() -> str:
    try:
        rows = supabase.table("SegurancaSessao").select("epoch").eq("id", 1).execute().data
    except Exception as exc:
        raise HTTPException(503, "Não foi possível validar a sessão") from exc
    if not rows:
        raise HTTPException(503, "Configuração de segurança indisponível")
    return str(rows[0]["epoch"])


def get_token_version(table: str, email: str) -> int:
    prefix = "adm" if table == "Administrador" else "usu"
    try:
        rows = supabase.table(table).select(f"{prefix}TokenVersion").eq(f"{prefix}Email", email).limit(1).execute().data
    except Exception as exc:
        raise HTTPException(503, "Não foi possível validar a sessão") from exc
    if not rows:
        raise HTTPException(401, "Conta não encontrada")
    return int(rows[0][f"{prefix}TokenVersion"])


def invalidate_token_version_cache(table: str, email: str) -> None:
    # Mantido por compatibilidade; não há cache local de autorização.
    return None


TAMANHO_LOTE_SUPABASE = 100


def utc_now() -> datetime:
    """Retorna o instante atual como datetime aware em UTC."""
    return datetime.now(timezone.utc)


def business_today():
    return utc_now().astimezone(ZoneInfo("America/Sao_Paulo")).date()


def datetime_utc(value: str | datetime) -> datetime:
    """Normaliza timestamps do banco (com ou sem timezone) para UTC aware."""
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00")) if isinstance(value, str) else value
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def buscar_todos(criar_consulta) -> list:
    """Busca TODAS as linhas de uma consulta Supabase, paginando em blocos de
    TAMANHO_LOTE_SUPABASE via .range().

    Necessário porque o projeto Supabase tem um limite de linhas por
    requisição (Max Rows, configurado no painel do Supabase em
    Settings > API): qualquer .execute() sem paginação explícita é truncado
    nesse limite, mesmo que existam mais linhas atendendo ao filtro — sem
    erro nenhum, o `.data` simplesmente vem incompleto.

    `criar_consulta` deve ser uma função sem argumentos que retorna um query
    builder do Supabase ainda não executado (ex.: lambda: supabase.table(...)
    .select(...).eq(...)), para que possamos encadear `.range()` nele antes
    de chamar `.execute()`.
    """
    registros = []
    inicio = 0
    while True:
        resposta = criar_consulta().range(inicio, inicio + TAMANHO_LOTE_SUPABASE - 1).execute()
        pagina = resposta.data or []
        registros.extend(pagina)
        if len(pagina) < TAMANHO_LOTE_SUPABASE:
            break
        inicio += TAMANHO_LOTE_SUPABASE
    return registros


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
    return 30  # padrão também usado pelo frontend

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)


def hash_password(password: str) -> str:
    if len(password)<8 or len(password.encode('utf-8'))>72:
        raise HTTPException(422,'Senha deve ter pelo menos 8 caracteres e no máximo 72 bytes')
    try:
        rows=supabase.table('Configuracoes').select('chave,valor').in_('chave',['tamanho_minimo_senha','exigir_senha_forte']).execute().data or []
        config={r['chave']:r['valor'] for r in rows}
    except Exception as exc:
        raise HTTPException(503,'Política de senhas indisponível') from exc
    minimo=max(8,min(32,int(config.get('tamanho_minimo_senha','8'))))
    if len(password)<minimo or len(password.encode('utf-8'))>72:
        raise HTTPException(422,f'A senha deve ter pelo menos {minimo} caracteres e no máximo 72 bytes')
    if config.get('exigir_senha_forte','false')=='true' and not (any(c.isalpha() for c in password) and any(c.isdigit() for c in password) and any(not c.isalnum() for c in password)):
        raise HTTPException(422,'A senha deve conter letras, números e símbolos')
    return bcrypt.hashpw(password.encode('utf-8'),bcrypt.gensalt()).decode('ascii')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return len(plain.encode('utf-8'))<=72 and bcrypt.checkpw(plain.encode('utf-8'),hashed.encode('ascii'))
    except (ValueError, TypeError):
        return False


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
    minutes = max(1, min(1440, get_session_timeout_minutes()))
    expire = utc_now() + timedelta(minutes=minutes)
    data = {**data, "exp": expire, "tv": token_version, "epoch": get_session_epoch()}
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def _authenticate(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(401, "Token inválido ou expirado") from exc
    tipo = payload.get("tipo")
    if tipo not in ("admin", "Aluno", "Comunidade") or not payload.get("sub"):
        raise HTTPException(401, "Token inválido")
    table, prefix = ("Administrador", "adm") if tipo == "admin" else ("Usuario", "usu")
    try:
        rows = supabase.table(table).select("*").eq(f"{prefix}Email", payload["sub"]).limit(1).execute().data
    except Exception as exc:
        raise HTTPException(503, "Não foi possível validar a sessão") from exc
    if not rows or not parse_status(rows[0].get(f"{prefix}Status")):
        raise HTTPException(401, "Conta inexistente ou inativa")
    account = rows[0]
    if account.get("usuExcluido"):
        raise HTTPException(401, "Conta excluída")
    if payload.get("tv") != account.get(f"{prefix}TokenVersion") or payload.get("epoch") != get_session_epoch():
        raise HTTPException(401, "Sessão expirada. Faça login novamente")
    if tipo != "admin" and tipo != account.get("usuTipo"):
        raise HTTPException(401, "Perfil alterado. Faça login novamente")
    payload["id"] = account["idAdmin" if tipo == "admin" else "idUsuario"]
    payload["admProfessor"] = bool(account.get("admProfessor"))
    payload["senhaProvisoria"] = bool(account.get("usuSenhaProvisoria"))
    return payload


def get_admin(token: str = Depends(oauth2_scheme)):
    payload = _authenticate(token)
    if payload["tipo"] != "admin" or payload["admProfessor"]:
        raise HTTPException(403, "Acesso restrito à equipe gestora")
    return payload


def get_professor(token: str = Depends(oauth2_scheme)):
    payload = _authenticate(token)
    if payload["tipo"] != "admin" or not payload["admProfessor"]:
        raise HTTPException(403, "Acesso restrito a professores")
    return payload


def get_admin_ou_professor(token: str = Depends(oauth2_scheme)):
    payload = _authenticate(token)
    if payload["tipo"] != "admin":
        raise HTTPException(403, "Acesso restrito a administradores e professores")
    return payload


def get_user_profile(token: str = Depends(oauth2_scheme)):
    payload = _authenticate(token)
    if payload["tipo"] not in ("Aluno", "Comunidade"):
        raise HTTPException(403, "Acesso restrito a usuários")
    return payload


def get_user(token: str = Depends(oauth2_scheme)):
    payload = get_user_profile(token)
    if payload["senhaProvisoria"]:
        raise HTTPException(403, "Defina sua senha antes de continuar")
    return payload


def get_loan_reader(token: str = Depends(oauth2_scheme)):
    payload = _authenticate(token)
    if payload["tipo"] == "admin":
        if payload["admProfessor"]:
            raise HTTPException(403, "Use a área do professor")
    elif payload["senhaProvisoria"]:
        raise HTTPException(403, "Defina sua senha antes de continuar")
    return payload


def get_optional_user(token: Optional[str] = Depends(optional_oauth2_scheme)):
    return _authenticate(token) if token else None


def get_admin_id(admin):
    if admin.get("id"):
        return admin["id"]
    admin_db = supabase.table("Administrador") \
        .select("idAdmin") \
        .eq("admEmail", admin["sub"]) \
        .execute()

    return admin_db.data[0]["idAdmin"] if admin_db.data else None




_CHAVES_TABELAS = {
    'Administrador':'idAdmin','Usuario':'idUsuario','Livro':'idLivro','Exemplar':'idExemplar',
    'Autor':'idAutor','Editora':'idEditora','Categoria':'idCategoria','Genero':'idGenero',
    'LivroAutor':'idLivro,idAutor','LivroCategoria':'idLivro,idCategoria','LivroGenero':'idLivro,idGenero',
    'Movimentacao':'idMovimentacao','MovimentacaoExemplar':'idMovimentacao,idExemplar',
    'Configuracoes':'chave','FichaCatalografica':'idFicha','RedefinicaoSenha':'idRedefinicao'}


def consultar_completo(criar_consulta, tabela):
    from types import SimpleNamespace
    def consulta():
        from copy import copy
        q=copy(criar_consulta())
        for coluna in _CHAVES_TABELAS[tabela].split(','): q=q.order(coluna)
        return q
    dados=buscar_todos(consulta)
    return SimpleNamespace(data=dados,count=len(dados))


def consultar_lote(criar_consulta, tabela, ids):
    from types import SimpleNamespace
    dados=[]; ids=list(dict.fromkeys(ids))
    for inicio in range(0,len(ids),100):
        lote=ids[inicio:inicio+100]
        dados.extend(consultar_completo(lambda:criar_consulta(lote),tabela).data)
    return SimpleNamespace(data=dados,count=len(dados))


def conta_publica(conta):
    permitidos={'idAdmin','admNome','admEmail','admStatus','admProfessor','admTema',
        'idUsuario','usuNome','usuEmail','usuTelefone','usuTelefoneResponsavel','usuEndereco',
        'usuRA','usuCPF','usuTipo','usuStatus','usuSerie','usuTurma','usuAnoLetivo','usuFormado',
        'usuTema','usuSenhaProvisoria','usuDataNascimento','usuExcluido'}
    return {k:v for k,v in conta.items() if k in permitidos}
