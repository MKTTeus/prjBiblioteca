"""Consultas de leitura explicitamente permitidas para a Novi.

Somente o router autenticado chama estas funções. Nenhum resultado bruto é
entregue ao modelo: selecionamos colunas e formatamos a resposta aqui.
"""

import re

import busca
from core import business_today
from database import supabase


MAX_TITULOS_BUSCA = 8      # títulos devolvidos numa busca por nome
MAX_TITULOS_AMOSTRA = 5    # títulos devolvidos numa amostra sem termo
MAX_LINHAS_EXEMPLAR = 1000 # teto do PostgREST; ao atingi-lo a contagem não é confiável
MAX_LINHAS_CATALOGO = 5000 # limite de segurança da busca sem acentos
MAX_TOMBOS_POR_TITULO = 5
MAX_NOMES_EQUIPE = 10


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
                 r"\bRA[\s:#-]*\d{3,}\b|\b(?:sk-|AIza)[A-Za-z0-9_-]{15,}\b|"
                 r"\b(?:Bearer\s+)?eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b", value, re.IGNORECASE):
        return "[dado omitido]"
    return re.sub(r"[\\*`_\[\]<>]", "", value)


def _buscar_titulos(term: str, columns: str, limit: int) -> tuple[list[dict], int]:
    """Busca primeiro no banco (rápida); se não houver resultado, compara no catálogo
    paginado ignorando acentos/ordem das palavras e tolerando erros de digitação.
    Nunca retorna uma contagem parcial."""
    result = (supabase.table("Livro").select(columns, count="exact")
              .ilike("livTitulo", f"%{term}%").order("livTitulo").limit(limit).execute())
    if result.data:
        if result.count is None:
            raise RuntimeError("Contagem de títulos indisponível")
        return result.data, int(result.count)

    catalogo = []
    page_size = 500
    for start in range(0, MAX_LINHAS_CATALOGO, page_size):
        page = (supabase.table("Livro").select(columns).order("livTitulo")
                .range(start, start + page_size - 1).execute().data or [])
        catalogo.extend(page)
        if len(page) < page_size:
            achados, _ = busca.filtrar(catalogo, term, lambda row: [row.get("livTitulo")])
            return achados[:limit], len(achados)
    raise RuntimeError("Catálogo excede limite da busca sem acentos")


def consultar(kind: str, admin: dict, term: str | None = None, filtro: str = "todos") -> tuple[str, str]:
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

    if kind == "contar_comunidade":
        total = _contar(supabase.table("Usuario").select("idUsuario", count="exact", head=True)
                        .eq("usuTipo", "Comunidade").eq("usuExcluido", False))
        return f"Há **{total} pessoas da comunidade cadastradas e não excluídas** neste momento.", "/admin/comunidade"

    if kind == "contar_equipe_inativa":
        professores = _contar(supabase.table("Administrador").select("idAdmin", count="exact", head=True)
                             .eq("admProfessor", True).eq("admStatus", False))
        gestores = _contar(supabase.table("Administrador").select("idAdmin", count="exact", head=True)
                           .eq("admProfessor", False).eq("admStatus", False))
        return (f"Há **{professores} professor{'es' if professores != 1 else ''} desativado{'s' if professores != 1 else ''}** "
                f"e **{gestores} gestor{'es' if gestores != 1 else ''} desativado{'s' if gestores != 1 else ''}**.", "/admin/admins")

    staff = {
        "professores": (True, True), "gestores": (False, True),
        "professores_inativos": (True, False), "gestores_inativos": (False, False),
    }
    if kind.startswith("contar_") and kind[7:] in staff:
        is_professor, active = staff[kind[7:]]
        total = _contar(supabase.table("Administrador").select("idAdmin", count="exact", head=True)
                        .eq("admProfessor", is_professor).eq("admStatus", active))
        label = "professor" if is_professor else "gestor"
        status = "ativo" if active else "desativado"
        suffix = " Posso informar os nomes se desejar." if is_professor and active else ""
        return f"Há **{total} {label}{'es' if total != 1 else ''} {status}{'s' if total != 1 else ''}** cadastrados.{suffix}", "/admin/admins"

    if kind.startswith("listar_") and kind[7:] in staff:
        is_professor, active = staff[kind[7:]]
        label = "professores" if is_professor else "gestores"
        result = (supabase.table("Administrador").select("admNome", count="exact")
                  .eq("admProfessor", is_professor).eq("admStatus", active)
                  .order("admNome").limit(MAX_NOMES_EQUIPE).execute())
        if result.count is None:
            raise RuntimeError("Contagem da equipe indisponível")
        total = int(result.count)
        status = "ativos" if active else "desativados"
        if not total:
            return f"Não há {label} {status} cadastrados neste momento.", "/admin/admins"
        names = [name for row in (result.data or [])
                 if (name := _texto_publico(row.get("admNome"))) and name != "[dado omitido]"]
        suffix = (f" Mostro {len(names)} de {total}; confira os demais em Cadastro de Administradores."
                  if total > len(names) else "")
        if not names:
            return f"Há **{total} {label} {status}**, mas não consegui exibir os nomes com segurança. Confira Cadastro de Administradores.", "/admin/admins"
        return f"{label.capitalize()} {status} cadastrados ({total}): **{'**, **'.join(names)}**.{suffix}", "/admin/admins"

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

    if kind in ("consultar_livros", "listar_livros", "consultar_exemplares"):
        if kind != "listar_livros":
            term = re.sub(r"[%_*\\]", "", str(term or "")).strip(" \t.,?!:;\"'")[:80]
        if kind != "listar_livros" and len(term) < 2:
            return "Qual é o título que você quer buscar? Posso conferir o cadastro e indicar a tela do acervo.", "/admin/biblioteca"
        columns = ("idLivro,livTitulo,livAtivo" if kind == "consultar_exemplares" else
                   "idLivro,livTitulo,livISBN,livPaginas,livAnoPublicacao,livAtivo")
        limit = MAX_TITULOS_BUSCA if term else MAX_TITULOS_AMOSTRA
        if term:
            rows, found = _buscar_titulos(term, columns, limit)
        else:
            result = supabase.table("Livro").select(columns, count="exact").order("livTitulo").limit(limit).execute()
            rows, found = result.data or [], int(result.count) if result.count is not None else len(result.data or [])
        if not rows:
            return "Não encontrei título com esse nome no cadastro. Confira a grafia ou pesquise no acervo.", "/admin/biblioteca"
        if kind == "consultar_exemplares":
            if filtro not in ("todos", "disponiveis"):
                raise ValueError("Filtro de exemplares não permitido")
            ids = [row["idLivro"] for row in rows if row.get("livAtivo") is not False or filtro == "todos"]
            exemplares = (supabase.table("Exemplar").select("idLivro,exeLivTombo,exeLivStatus")
                          .in_("idLivro", ids).limit(MAX_LINHAS_EXEMPLAR).execute().data or []) if ids else []
            if len(exemplares) >= MAX_LINHAS_EXEMPLAR:
                raise RuntimeError("Consulta de exemplares incompleta")
            parts = []
            for row in rows:
                title = _texto_publico(row.get("livTitulo"))
                if row.get("livAtivo") is False and filtro == "disponiveis":
                    continue
                matching = [ex for ex in exemplares if ex.get("idLivro") == row["idLivro"]
                            and (filtro == "todos" or ex.get("exeLivStatus") == "Disponível")]
                tombos = [_texto_publico(ex.get("exeLivTombo")) for ex in matching]
                omitted = sum(value == "[dado omitido]" for value in tombos)
                tombos = [value for value in tombos if value and value != "[dado omitido]"]
                preview = ", ".join(f"**{value}**" for value in tombos[:MAX_TOMBOS_POR_TITULO]) or "nenhum"
                extra = f"; mais {len(tombos) - MAX_TOMBOS_POR_TITULO} na tela" if len(tombos) > MAX_TOMBOS_POR_TITULO else ""
                if omitted:
                    extra += f"; {omitted} identificador(es) omitido(s) por segurança"
                inactive = " (título inativo)" if row.get("livAtivo") is False else ""
                parts.append(f"- {title}{inactive}: {len(matching)} exemplar(es)"
                             f"{' disponível(is)' if filtro == 'disponiveis' else ''}; tombos: {preview}{extra}")
            scope = "disponíveis" if filtro == "disponiveis" else "cadastrados (com seus status na tela)"
            header = f"Tombos dos exemplares {scope} para \"{_texto_publico(term)}\":"
            if found > len(rows):
                header += f" mostro {len(rows)} de {found} títulos; refine a busca para ver os demais."
            if not parts:
                return f"Não há títulos ativos com exemplares disponíveis nessa busca. Confira o acervo.", "/admin/biblioteca"
            return "\n".join([header, *parts, "A disponibilidade pode mudar; confira no acervo."]), "/admin/biblioteca"
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
