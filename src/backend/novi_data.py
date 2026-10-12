"""Consultas de leitura explicitamente permitidas para a Novi.

Somente o router autenticado chama estas funções. Nenhum resultado bruto é
entregue ao modelo: selecionamos colunas e formatamos a resposta aqui.
"""

import re

from core import business_today
from database import supabase


def _contar(query) -> int:
    response = query.execute()
    if response.count is None:
        raise RuntimeError("Contagem exata indisponível")
    return int(response.count)


def _texto_publico(value) -> str:
    value = re.sub(r"[\x00-\x1f\x7f]", " ", str(value or ""))[:110].strip()
    if re.search(r"[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{3}[. ]?\d{3}[. ]?\d{3}[- ]?\d{2}\b|"
                 r"\b(?:\+55[ .-]?)?\(?\d{2}\)?[ .-]?\d{4,5}[ .-]?\d{4}\b|"
                 r"\bRA[\s:#-]*\d{3,}\b|\b(?:sk-|AIza)[A-Za-z0-9_-]{15,}\b", value, re.IGNORECASE):
        return "[dado omitido]"
    return re.sub(r"[\\*`_\[\]<>]", "", value)


def consultar(kind: str, admin: dict, term: str | None = None) -> tuple[str, str]:
    """Retorna (mensagem, rota). Somente agregados, catálogo e nome próprio."""
    if kind == "meu_nome":
        rows = (supabase.table("Administrador").select("admNome").eq("idAdmin", admin["id"]).limit(1).execute().data or [])
        if not rows:
            raise RuntimeError("Conta não encontrada")
        return f"Seu nome cadastrado é **{_texto_publico(rows[0]['admNome'])}**.", "/admin/configuracoes/geral"

    if kind in ("contar_alunos", "contar_alunos_ativos"):
        query = supabase.table("Usuario").select("idUsuario", count="exact", head=True).eq("usuTipo", "Aluno").eq("usuExcluido", False)
        active = kind == "contar_alunos_ativos"
        if active:
            query = query.eq("usuStatus", True).eq("usuFormado", False)
        total = _contar(query)
        scope = "ativos e não formados" if active else "cadastrados e não excluídos"
        return f"Há **{total} alunos {scope}** neste momento. Confira os filtros em Cadastro de Alunos para outros recortes.", "/admin/alunos"

    if kind == "contar_professores":
        total = _contar(supabase.table("Administrador").select("idAdmin", count="exact", head=True).eq("admProfessor", True).eq("admStatus", True))
        return f"Há **{total} professores ativos** cadastrados. Os nomes e dados das contas ficam na tela de Cadastro de Administradores.", "/admin/admins"

    if kind in ("contar_livros", "contar_exemplares", "contar_disponiveis"):
        if kind == "contar_disponiveis":
            total = _contar(supabase.table("Exemplar").select("idExemplar", count="exact", head=True)
                            .eq("exeLivStatus", "Disponível"))
            return f"Há **{total} exemplares com status Disponível** agora, inclusive em títulos que podem estar inativos. Confira o título no acervo antes de orientar um empréstimo.", "/admin/biblioteca"
        table, column, label, route = (
            ("Livro", "idLivro", "títulos cadastrados", "/admin/livros") if kind == "contar_livros" else
            ("Exemplar", "idExemplar", "exemplares cadastrados", "/admin/livros")
        )
        total = _contar(supabase.table(table).select(column, count="exact", head=True))
        return f"Há **{total} {label}** no cadastro, incluindo itens inativos. Para conferir disponibilidade, abra o acervo.", route

    if kind == "livros_sem_exemplar":
        # Filtro anti-join do PostgREST: conta títulos sem qualquer cópia,
        # sem transferir o catálogo inteiro e sem depender de texto do modelo.
        result = (supabase.table("Livro").select("idLivro,livTitulo,Exemplar()", count="exact")
                  .is_("Exemplar", "null").order("livTitulo").limit(5).execute())
        if result.count is None:
            raise RuntimeError("Contagem exata indisponível")
        total = int(result.count)
        if total == 0:
            return "Não há **títulos sem exemplar** no cadastro neste momento.", "/admin/livros"
        titles = [f"- **{_texto_publico(row.get('livTitulo'))}**" for row in (result.data or [])]
        listagem = "\n" + "\n".join(titles) if titles else ""
        return (f"Há **{total} título{'s' if total != 1 else ''} sem exemplar cadastrado**"
                f" (incluindo inativos).{' Alguns deles:' if titles else ''}{listagem}\n"
                "Abra Cadastro de Livros para conferir os registros e adicionar cópias, se necessário.", "/admin/livros")

    if kind == "indicadores":
        active = _contar(supabase.table("Movimentacao").select("idMovimentacao", count="exact", head=True).eq("movStatus", "Ativo"))
        pending = _contar(supabase.table("Movimentacao").select("idMovimentacao", count="exact", head=True).eq("movStatus", "Pendente"))
        late = _contar(supabase.table("MovimentacaoExemplar").select("idExemplar", count="exact", head=True)
                       .eq("itemStatus", "Ativo").is_("dataDevolucao", "null")
                       .lt("dataPrevistaDevolucao", business_today().isoformat()))
        return (f"Resumo atual da circulação:\n- **{active} empréstimos ativos**\n- **{pending} solicitações pendentes**\n"
                f"- **{late} exemplares em atraso**\nAbra Relatórios para filtros e detalhes autorizados.", "/admin/relatorios")

    if kind in ("consultar_livros", "listar_livros"):
        if kind == "consultar_livros":
            term = re.sub(r"[%_*\\]", "", str(term or "")).strip(" \t.,?!:;\"'")[:80]
        if kind == "consultar_livros" and len(term) < 2:
            return "Qual é o título que você quer buscar? Posso conferir o cadastro e indicar a tela do acervo.", "/admin/biblioteca"
        if kind == "listar_livros":
            term = None
        query = supabase.table("Livro").select("idLivro,livTitulo,livISBN,livPaginas,livAnoPublicacao,livAtivo")
        if term:
            query = query.ilike("livTitulo", f"%{term}%")
        rows = query.order("livTitulo").limit(5).execute().data or []
        if not rows:
            return "Não encontrei título com esse nome no cadastro. Confira a grafia ou pesquise no acervo.", "/admin/biblioteca"
        parts = []
        for row in rows:
            title = _texto_publico(row.get("livTitulo"))
            isbn = _texto_publico(row.get("livISBN"))
            year = row.get("livAnoPublicacao")
            pages = row.get("livPaginas")
            summary = f"**{title}** — {'ativo' if row.get('livAtivo') is not False else 'inativo'}"
            if year is not None: summary += f", {year}"
            if pages is not None: summary += f", {pages} páginas"
            if isbn: summary += f", ISBN {isbn}"
            if term and len(rows) == 1:
                copies = _contar(supabase.table("Exemplar").select("idExemplar", count="exact", head=True).eq("idLivro", row["idLivro"]))
                summary += f", {copies} exemplares cadastrados"
                if row.get("livAtivo") is False:
                    summary += "; título desativado no catálogo"
                else:
                    available = _contar(supabase.table("Exemplar").select("idExemplar", count="exact", head=True)
                                        .eq("idLivro", row["idLivro"]).eq("exeLivStatus", "Disponível"))
                    summary += f" e {available} disponíveis"
            parts.append(f"- {summary}")
        ending = "Resultados do cadastro (até cinco títulos). A disponibilidade de exemplares pode mudar; confira no acervo."
        return "\n".join(parts) + "\n" + ending, "/admin/biblioteca"

    raise ValueError("Consulta não permitida")
