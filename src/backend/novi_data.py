"""Consultas de leitura explicitamente permitidas para a Novi.

Somente o router autenticado chama estas funções. Nenhum resultado bruto é
entregue ao modelo: selecionamos colunas e formatamos a resposta aqui.
"""

import re

from core import business_today
from database import supabase


MAX_TITULOS_BUSCA = 8      # títulos devolvidos numa busca por nome
MAX_TITULOS_AMOSTRA = 5    # títulos devolvidos numa amostra sem termo
MAX_LINHAS_EXEMPLAR = 1000 # teto do PostgREST; ao atingi-lo a contagem não é confiável


def _contar(query) -> int:
    response = query.execute()
    if response.count is None:
        raise RuntimeError("Contagem exata indisponível")
    return int(response.count)


def _exemplares_por_livro(ids: list) -> dict:
    """Lê idLivro/status dos exemplares dos títulos pedidos numa única consulta e
    conta no servidor: {idLivro: [cadastrados, disponíveis]}. Nunca devolve contagem
    parcial: se o teto de linhas for atingido, falha em vez de subestimar."""
    totals = {i: [0, 0] for i in ids}
    if not ids:
        return totals
    rows = (supabase.table("Exemplar").select("idLivro,exeLivStatus").in_("idLivro", ids)
            .limit(MAX_LINHAS_EXEMPLAR).execute().data or [])
    if len(rows) >= MAX_LINHAS_EXEMPLAR:
        raise RuntimeError("Contagem de exemplares incompleta")
    for row in rows:
        entry = totals.get(row.get("idLivro"))
        if entry is not None:
            entry[0] += 1
            if row.get("exeLivStatus") == "Disponível":
                entry[1] += 1
    return totals


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
        query = supabase.table("Livro").select("idLivro,livTitulo,livISBN,livPaginas,livAnoPublicacao,livAtivo", count="exact")
        if term:
            query = query.ilike("livTitulo", f"%{term}%")
        limit = MAX_TITULOS_BUSCA if term else MAX_TITULOS_AMOSTRA
        result = query.order("livTitulo").limit(limit).execute()
        rows = result.data or []
        if not rows:
            return "Não encontrei título com esse nome no cadastro. Confira a grafia ou pesquise no acervo.", "/admin/biblioteca"
        found = int(result.count) if result.count is not None else len(rows)
        counts = _exemplares_por_livro([row["idLivro"] for row in rows])
        parts, copies_sum, available_sum = [], 0, 0
        for row in rows:
            copies, available = counts[row["idLivro"]]
            active = row.get("livAtivo") is not False
            summary = f"**{_texto_publico(row.get('livTitulo'))}** — {'ativo' if active else 'inativo'}"
            if row.get("livAnoPublicacao") is not None: summary += f", {row['livAnoPublicacao']}"
            if row.get("livPaginas") is not None: summary += f", {row['livPaginas']} páginas"
            isbn = _texto_publico(row.get("livISBN"))
            if isbn: summary += f", ISBN {isbn}"
            summary += f", {copies} exemplares cadastrados"
            copies_sum += copies
            if not active:
                summary += "; título desativado no catálogo"
            else:
                summary += f" e {available} disponíveis"
                available_sum += available
            parts.append(f"- {summary}")
        plural = "s" if found != 1 else ""
        header = (f"Encontrei **{found} título{plural}** com \"{_texto_publico(term)}\" no cadastro"
                  if term else f"Amostra de títulos do cadastro (há {found} no total)")
        if found > len(rows):
            header += f"; mostro os {len(rows)} primeiros em ordem alfabética"
        lines = [header + ":", *parts]
        if len(rows) > 1:
            lines.append(f"Somando os títulos listados: **{copies_sum} exemplares cadastrados** e "
                         f"**{available_sum} disponíveis** (apenas títulos ativos).")
        lines.append("A disponibilidade de exemplares pode mudar; confira no acervo.")
        return "\n".join(lines), "/admin/biblioteca"

    raise ValueError("Consulta não permitida")
