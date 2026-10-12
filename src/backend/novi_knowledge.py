"""Fontes locais e versionadas da Novi. Nenhum dado do banco entra aqui."""

import ast
from functools import lru_cache
from pathlib import Path
import re
import unicodedata


ROOT = Path(__file__).resolve().parents[2]
DOCS = (
    "docs/GUIA_DE_USO.md",
    "docs/REGRAS_E_FLUXOS.md",
    "docs/ARQUITETURA.md",
)

# Somente símbolos revisados podem ser usados como complemento das orientações.
# O modelo não recebe uma ferramenta para ler arquivos ou consultar o GitHub.
CODE = {
    "solicitacoes": (("src/backend/routers/emprestimos.py", "solicitar_livro"),
                     ("src/backend/routers/emprestimos.py", "aprovar_solicitacao"),
                     ("src/backend/routers/emprestimos.py", "registrar_retirada")),
    "emprestimos": (("src/backend/routers/emprestimos.py", "criar_emprestimo"),
                    ("src/backend/routers/emprestimos.py", "devolver_emprestimo"),
                    ("src/backend/routers/emprestimos.py", "renovar_emprestimo")),
    "livros": (("src/backend/routers/livros.py", "alterar_status_livro"),
               ("src/backend/routers/livros.py", "adicionar_exemplares"),
               ("src/backend/routers/livros.py", "deletar_livro")),
    "autores": (("src/backend/routers/autores.py", "mesclar_autor"),),
    "generos": (("src/backend/routers/generos.py", "mesclar_genero"),),
    "alunos": (("src/backend/routers/usuarios.py", "importar_alunos"),
               ("src/backend/routers/usuarios.py", "deletar_aluno")),
    "comunidade": (("src/backend/routers/usuarios.py", "importar_comunidade"),),
    "admins": (("src/backend/routers/admins.py", "criar_admin"),),
    "professor": (("src/backend/routers/professor.py", "criar_emprestimo_professor"),),
    "relatorios": (("src/backend/routers/relatorios.py", "relatorio_emprestimos"),),
    "ano_letivo": (("src/backend/routers/ano_letivo.py", "encerrar_ano_letivo"),),
    "backups": (("src/backend/routers/backup.py", "backup_restaurar"),),
    "configuracoes": (("src/backend/routers/emprestimos.py", "atualizar_configuracao"),),
    "notificacoes": (("src/backend/routers/emails.py", "processar_fila_emails"),),
    "ficha": (("src/backend/routers/ficha_catalografica.py", "gerar_ficha_catalografica"),),
    "recomendacoes": (("src/backend/routers/recomendacoes.py", "avaliar_livro"),),
}

ROUTES = {
    "inicio": ("Início", "/admin"),
    "biblioteca": ("Biblioteca", "/admin/biblioteca"),
    "livros": ("Cadastro de Livros", "/admin/livros"),
    "autores": ("Cadastros Auxiliares: Autores", "/admin/livros/cadastros-auxiliares/autores"),
    "generos": ("Cadastros Auxiliares: Gêneros", "/admin/livros/cadastros-auxiliares/generos"),
    "emprestimos": ("Empréstimos e Devoluções", "/admin/emprestimos"),
    "solicitacoes": ("Solicitações de Empréstimo", "/admin/emprestimos/solicitacoes"),
    "alunos": ("Cadastro de Alunos", "/admin/alunos"),
    "comunidade": ("Cadastro da Comunidade", "/admin/comunidade"),
    "admins": ("Cadastro de Administradores", "/admin/admins"),
    "relatorios": ("Relatórios", "/admin/relatorios"),
    "notificacoes": ("Notificações", "/admin/notificacoes"),
    "config_notificacoes": ("Configurações de Notificações", "/admin/configuracoes/notificacoes"),
    "configuracoes": ("Configurações Gerais", "/admin/configuracoes/geral"),
    "seguranca": ("Configurações de Segurança", "/admin/configuracoes/seguranca"),
    "email": ("Configurações de E-mail", "/admin/configuracoes/email"),
    "ano_letivo": ("Ano Letivo", "/admin/configuracoes/ano-letivo"),
    "backups": ("Backups", "/admin/configuracoes/backups"),
    "avancado": ("Configurações Avançadas", "/admin/configuracoes/avancado"),
}

TOPIC_TERMS = {
    "solicitacoes": "solicitacao solicitar pedido aprovar rejeitar retirada retirar reservado prazo expirar confirmacao",
    "emprestimos": "emprestimo emprestar devolver devolucao renovar renovacao tombo atraso",
    "livros": "livro acervo cadastrar titulo exemplar capa isbn ativar desativar excluir",
    "autores": "autor autores mesclar",
    "generos": "genero generos categoria categorias mesclar",
    "alunos": "aluno alunos importar ra cadastro retido",
    "comunidade": "comunidade cpf importar cadastro",
    "admins": "administrador gestor professor perfil cadastrar desativar",
    "professor": "professor turma emprestimo coletivo finalidade",
    "relatorios": "relatorio relatorios indicador dados grafico atraso acervo",
    "ano_letivo": "ano letivo encerrar fechar promover formado retido serie",
    "backups": "backup backups restaurar restauracao recuperar exportar",
    "configuracoes": "configuracao configurar limite prazo biblioteca tema salvar",
    "seguranca": "senha seguranca sessao timeout forte",
    "email": "email e-mail remetente envio",
    "notificacoes": "notificacao aviso cron circulacao",
    "config_notificacoes": "lembrete antecedencia preferencia notificar",
    "ficha": "ficha catalografica cdd catalogacao inteligencia artificial",
    "recomendacoes": "recomendacao avaliacao nota aluno leitura",
    "biblioteca": "buscar pesquisar procurar catalogo biblioteca",
    "inicio": "inicio dashboard painel resumo",
    "avancado": "avancado log api",
}

STOPWORDS = {"como", "qual", "quais", "para", "porque", "sobre", "onde", "uma", "uns", "dos",
             "das", "que", "com", "por", "meu", "minha", "essa", "esse", "isso", "tenho", "posso",
             "faco", "fazer", "preciso", "sistema", "novi", "ajuda", "ajudar", "favor"}


def words(value: str) -> set[str]:
    folded = unicodedata.normalize("NFKD", value.lower())
    folded = "".join(char for char in folded if not unicodedata.combining(char))
    return {word for word in re.findall(r"[a-z0-9]{3,}", folded) if word not in STOPWORDS}


def topic_for(question: str) -> str | None:
    query = words(question)
    ranked = sorted(((len(query & words(terms)), topic) for topic, terms in TOPIC_TERMS.items()), reverse=True)
    return ranked[0][1] if ranked and ranked[0][0] else None


def _split_sections(path: str) -> list[dict]:
    content = (ROOT / path).read_text(encoding="utf-8")
    heading = "Introdução"
    paragraphs = []
    buffer = []
    in_fence = False
    for line in content.splitlines():
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if line.startswith("## ") or line.startswith("### "):
            if buffer:
                paragraphs.append((heading, "\n".join(buffer)))
                buffer = []
            heading = line.lstrip("# ").strip()
        elif not line.strip():
            if buffer:
                paragraphs.append((heading, "\n".join(buffer)))
                buffer = []
        else:
            buffer.append(line)
    if buffer:
        paragraphs.append((heading, "\n".join(buffer)))
    return [{"fonte": path, "secao": title, "texto": text[:1800]} for title, text in paragraphs
            if len(text) > 35 and not text.startswith("|")]


@lru_cache(maxsize=1)
def doc_entries() -> tuple[dict, ...]:
    return tuple(entry for path in DOCS for entry in _split_sections(path))


def retrieve_docs(question: str, count: int = 5) -> list[dict]:
    query = words(question)
    if not query:
        return []
    ranked = []
    for entry in doc_entries():
        score = len(query & words(entry["texto"])) + 2 * len(query & words(entry["secao"]))
        if score:
            ranked.append((score, entry))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [entry for _, entry in ranked[:count]]


@lru_cache(maxsize=64)
def _extract_function(path: str, name: str) -> dict | None:
    source = (ROOT / path).read_text(encoding="utf-8")
    tree = ast.parse(source)
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            lines = source.splitlines()
            # Trecho estritamente limitado e revisado; nunca enviar o arquivo completo.
            snippet = "\n".join(lines[node.lineno - 1:node.end_lineno])[:3600]
            return {"fonte": path, "secao": name, "texto": snippet}
    return None


def retrieve_code(topic: str | None) -> list[dict]:
    return [entry for path, name in CODE.get(topic or "", ())
            if (entry := _extract_function(path, name)) is not None]
