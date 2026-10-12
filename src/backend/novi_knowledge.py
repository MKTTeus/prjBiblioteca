"""Fontes locais e versionadas da Novi. Nenhum dado do banco entra aqui."""

import ast
from functools import lru_cache
from pathlib import Path
import re
import unicodedata


ROOT = Path(__file__).resolve().parents[2]
DOCS = (
    "docs/NOVI_FLUXOS_GESTOR.md",
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
    "livros": (("src/backend/routers/livros.py", "criar_livro"),
               ("src/backend/routers/ia.py", "completar_com_ia"),
               ("src/backend/routers/livros.py", "alterar_status_livro"),
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
    "biblioteca": ("Acervo da Sala de Leitura", "/admin/biblioteca"),
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

STOPWORDS = {"como", "qual", "quais", "para", "porque", "sobre", "onde", "uma", "uns", "dos",
             "das", "que", "com", "por", "meu", "minha", "essa", "esse", "isso", "tenho", "posso",
             "faco", "fazer", "preciso", "sistema", "novi", "ajuda", "ajudar", "favor",
             "passo", "passos", "explique", "melhor", "mais", "detalhes", "detalhe", "pedido",
             "continuacao"}


def words(value: str) -> set[str]:
    folded = unicodedata.normalize("NFKD", value.lower())
    folded = "".join(char for char in folded if not unicodedata.combining(char))
    return {word for word in re.findall(r"[a-z0-9]{3,}", folded) if word not in STOPWORDS}


def _split_sections(path: str) -> list[dict]:
    content = (ROOT / path).read_text(encoding="utf-8")
    heading = "Introdução"
    sections = []
    lines = []
    in_fence = False

    def flush():
        # Preserve a procedure and its caveats in the same source entry. The
        # old paragraph split made repeated headings crowd out other flows.
        body = "\n".join(lines).strip()
        if len(body) > 35:
            while body:
                chunk, body = body[:1800], body[1800:]
                sections.append({"fonte": path, "secao": heading, "texto": chunk})

    for line in content.splitlines():
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if line.startswith("## ") or line.startswith("### "):
            flush()
            lines = []
            heading = line.lstrip("# ").strip()
        elif not line.startswith("|"):
            lines.append(line)
    flush()
    return sections


@lru_cache(maxsize=1)
def doc_entries() -> tuple[dict, ...]:
    return tuple(entry for path in DOCS for entry in _split_sections(path))


def retrieve_docs(question: str, count: int = 5) -> list[dict]:
    query = words(question)
    if not query:
        return []
    # Short common roots match inflections such as cadastrar/cadastro and
    # solicitar/solicitação without an exact phrase or a handpicked intent.
    roots = {word[:6] if len(word) >= 6 else word for word in query}
    ranked = []
    for entry in doc_entries():
        heading = {word[:6] if len(word) >= 6 else word for word in words(entry["secao"])}
        body = {word[:6] if len(word) >= 6 else word for word in words(entry["texto"])}
        score = len(roots & body) + 2 * len(roots & heading)
        if score:
            ranked.append((score, entry))
    ranked.sort(key=lambda item: item[0], reverse=True)
    relevant = [entry for score, entry in ranked if score >= 2] if len(roots) > 1 else []
    return relevant[:count] if relevant else [entry for _, entry in ranked[:count]]


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
