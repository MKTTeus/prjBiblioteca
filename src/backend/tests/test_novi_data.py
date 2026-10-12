from pathlib import Path
from types import SimpleNamespace
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import novi_data


class Query:
    def __init__(self, table, db):
        self.table = table
        self.db = db
        self.filters = []
        self.columns = None
        self.head = False
        self.start = None

    def select(self, columns, **kwargs):
        self.columns = columns
        self.head = kwargs.get("head", False)
        return self

    def eq(self, field, value):
        self.filters.append(("eq", field, value))
        return self

    def is_(self, field, value):
        self.filters.append(("is", field, value))
        return self

    def lt(self, field, value):
        self.filters.append(("lt", field, value))
        return self

    def ilike(self, field, value):
        self.filters.append(("ilike", field, value))
        return self

    def in_(self, field, values):
        self.filters.append(("in", field, tuple(values)))
        return self

    def order(self, field):
        return self

    def limit(self, value):
        assert value <= 1000
        return self

    def range(self, start, end):
        assert end - start < 1000
        self.start = start
        return self

    def execute(self):
        self.db.calls.append(self)
        return self.db.result(self)


class DB:
    def __init__(self, result):
        self.calls = []
        self.result = result

    def table(self, table):
        return Query(table, self)


def test_nome_proprio_is_from_authenticated_id_only(monkeypatch):
    def result(q):
        assert q.table == "Administrador"
        assert q.columns == "admNome"
        assert ("eq", "idAdmin", 9) in q.filters
        return SimpleNamespace(data=[{"admNome": "Vitor"}], count=None)

    monkeypatch.setattr(novi_data, "supabase", DB(result))
    answer, route = novi_data.consultar("meu_nome", {"id": 9})
    assert "**Vitor**" in answer
    assert route == "/admin/configuracoes/geral"


def test_student_and_professor_counts_use_exact_filters(monkeypatch):
    db = DB(lambda q: SimpleNamespace(data=None, count=37 if q.table == "Usuario" else 4))
    monkeypatch.setattr(novi_data, "supabase", db)
    answer, _ = novi_data.consultar("contar_alunos_ativos", {"id": 9})
    assert "37 alunos ativos" in answer
    assert db.calls[0].head and db.calls[0].columns == "idUsuario"
    assert {("eq", "usuTipo", "Aluno"), ("eq", "usuExcluido", False),
            ("eq", "usuStatus", True), ("eq", "usuFormado", False)} <= set(db.calls[0].filters)
    answer, _ = novi_data.consultar("contar_professores", {"id": 9})
    assert "4 professores ativos" in answer
    assert {("eq", "admProfessor", True), ("eq", "admStatus", True)} <= set(db.calls[1].filters)


def test_community_and_manager_counts_use_distinct_scopes(monkeypatch):
    db = DB(lambda q: SimpleNamespace(data=None, count=2 if q.table == "Usuario" else 3))
    monkeypatch.setattr(novi_data, "supabase", db)
    community, community_route = novi_data.consultar("contar_comunidade", {"id": 9})
    managers, manager_route = novi_data.consultar("contar_gestores", {"id": 9})
    assert "2 pessoas da comunidade" in community and community_route == "/admin/comunidade"
    assert "3 gestores ativos" in managers and manager_route == "/admin/admins"
    assert {("eq", "usuTipo", "Comunidade"), ("eq", "usuExcluido", False)} <= set(db.calls[0].filters)
    assert {("eq", "admProfessor", False), ("eq", "admStatus", True)} <= set(db.calls[1].filters)
    assert all(q.head and q.columns.startswith("id") for q in db.calls)


def test_staff_roster_returns_only_names_and_discloses_limit(monkeypatch):
    db = DB(lambda q: SimpleNamespace(data=[{"admNome": "Ana"}, {"admNome": "Bruno"}], count=11))
    monkeypatch.setattr(novi_data, "supabase", db)
    answer, route = novi_data.consultar("listar_professores", {"id": 9})
    assert "Ana" in answer and "Bruno" in answer and "Mostro 2 de 11" in answer
    assert route == "/admin/admins"
    query = db.calls[0]
    assert query.columns == "admNome" and not query.head
    assert {("eq", "admProfessor", True), ("eq", "admStatus", True)} <= set(query.filters)
    assert query.table == "Administrador"


def test_inactive_staff_counts_and_names_use_inactive_filter(monkeypatch):
    db = DB(lambda q: SimpleNamespace(data=[{"admNome": "Ana"}], count=1))
    monkeypatch.setattr(novi_data, "supabase", db)
    for kind in ("contar_gestores_inativos", "listar_gestores_inativos", "contar_equipe_inativa"):
        answer, route = novi_data.consultar(kind, {"id": 9})
        assert route == "/admin/admins" and "desativado" in answer
    assert {("eq", "admProfessor", False), ("eq", "admStatus", False)} <= set(db.calls[0].filters)
    assert db.calls[1].columns == "admNome"
    assert {("eq", "admProfessor", False), ("eq", "admStatus", False)} <= set(db.calls[1].filters)
    assert {("eq", "admProfessor", True), ("eq", "admStatus", False)} <= set(db.calls[2].filters)


def book(id_, title, active=True, year=2000):
    return {"idLivro": id_, "livTitulo": title, "livISBN": None, "livPaginas": 200,
            "livAnoPublicacao": year, "livAtivo": active}


def copies(id_, *statuses):
    return [{"idLivro": id_, "exeLivStatus": status} for status in statuses]


def test_book_lookup_returns_only_selected_fields_and_limits_result(monkeypatch):
    def result(q):
        if q.table == "Livro":
            return SimpleNamespace(data=[book(8, "Dom Casmurro", year=1899)], count=1)
        return SimpleNamespace(data=copies(8, "Disponível", "Emprestado"), count=None)
    db = DB(result)
    monkeypatch.setattr(novi_data, "supabase", db)
    answer, path = novi_data.consultar("consultar_livros", {"id": 9}, "Dom Casmurro")
    assert "**Dom Casmurro**" in answer and "2 exemplares cadastrados e 1 disponíveis" in answer
    assert path == "/admin/biblioteca"
    assert db.calls[0].columns == "idLivro,livTitulo,livISBN,livPaginas,livAnoPublicacao,livAtivo"
    assert (("ilike", "livTitulo", "%Dom Casmurro%") in db.calls[0].filters)
    assert db.calls[1].columns == "idLivro,exeLivStatus" and ("in", "idLivro", (8,)) in db.calls[1].filters
    assert all(q.table in ("Livro", "Exemplar") for q in db.calls)


def test_series_search_reports_total_and_copies_of_each_title_in_one_read(monkeypatch):
    def result(q):
        if q.table == "Livro":
            return SimpleNamespace(data=[book(1, "Harry Potter e a Pedra Filosofal"),
                                         book(2, "Harry Potter e a Câmara Secreta"),
                                         book(3, "Harry Potter antigo", active=False)], count=3)
        return SimpleNamespace(data=copies(1, "Disponível", "Disponível", "Emprestado") + copies(2, "Emprestado")
                               + copies(3, "Disponível"), count=None)
    db = DB(result)
    monkeypatch.setattr(novi_data, "supabase", db)
    answer, _ = novi_data.consultar("consultar_livros", {"id": 9}, "Harry Potter")
    assert "Encontrei **3 títulos** com \"Harry Potter\"" in answer
    assert "Pedra Filosofal** — ativo, 2000, 200 páginas, 3 exemplares cadastrados e 2 disponíveis" in answer
    assert "Câmara Secreta** — ativo, 2000, 200 páginas, 1 exemplares cadastrados e 0 disponíveis" in answer
    assert "título desativado no catálogo" in answer
    assert "**5 exemplares cadastrados** e **2 disponíveis** (apenas títulos ativos)" in answer
    assert [q.table for q in db.calls] == ["Livro", "Exemplar"]  # sem N+1


def test_search_larger_than_limit_says_so(monkeypatch):
    rows = [book(i, f"Título {i}") for i in range(1, 9)]
    def result(q):
        return (SimpleNamespace(data=rows, count=12) if q.table == "Livro"
                else SimpleNamespace(data=[], count=None))
    monkeypatch.setattr(novi_data, "supabase", DB(result))
    answer, _ = novi_data.consultar("consultar_livros", {"id": 9}, "Título")
    assert "**12 títulos**" in answer and "mostro os 8 primeiros" in answer


def test_truncated_copy_read_fails_instead_of_underreporting(monkeypatch):
    def result(q):
        if q.table == "Livro":
            return SimpleNamespace(data=[book(1, "Muito exemplar")], count=1)
        return SimpleNamespace(data=copies(1, *["Disponível"] * 1000), count=None)
    monkeypatch.setattr(novi_data, "supabase", DB(result))
    try:
        novi_data.consultar("consultar_livros", {"id": 9}, "Muito")
    except RuntimeError as exc:
        assert "incompleta" in str(exc)
    else:
        raise AssertionError("contagem parcial foi aceita")


def test_natural_book_title_query_and_general_total_are_distinct(monkeypatch):

    db = DB(lambda q: SimpleNamespace(data=[], count=None))
    monkeypatch.setattr(novi_data, "supabase", db)
    answer, path = novi_data.consultar("consultar_livros", {"id": 9}, "Harry Potter")
    assert "Não encontrei título" in answer and path == "/admin/biblioteca"
    assert ("ilike", "livTitulo", "%Harry Potter%") in db.calls[0].filters


def test_missing_search_title_prompts_for_title_without_listing_everything(monkeypatch):
    monkeypatch.setattr(novi_data, "supabase", DB(lambda q: (_ for _ in ()).throw(AssertionError("database called"))))
    answer, _ = novi_data.consultar("consultar_livros", {"id": 9})
    assert "Qual é o título" in answer


def test_books_without_copies_uses_anti_join_and_exact_count(monkeypatch):
    db = DB(lambda q: SimpleNamespace(data=[{"idLivro": 8, "livTitulo": "Livro sem cópia"}], count=1))
    monkeypatch.setattr(novi_data, "supabase", db)
    answer, path = novi_data.consultar("livros_sem_exemplar", {"id": 9})
    assert "**1 título sem exemplar cadastrado**" in answer
    assert "**Livro sem cópia**" in answer and path == "/admin/livros"
    assert db.calls[0].columns == "idLivro,livTitulo,Exemplar()"
    assert ("is", "Exemplar", "null") in db.calls[0].filters


def test_inactive_book_does_not_claim_public_availability(monkeypatch):
    def result(q):
        if q.table == "Livro":
            return SimpleNamespace(data=[book(8, "Exemplo", active=False)], count=1)
        return SimpleNamespace(data=copies(8, "Disponível", "Disponível"), count=None)
    monkeypatch.setattr(novi_data, "supabase", DB(result))
    answer, _ = novi_data.consultar("consultar_livros", {"id": 9}, "Exemplo")
    assert "desativado no catálogo" in answer
    assert "disponíveis" not in answer.split("\n")[1]


def test_public_book_text_omits_embedded_personal_data():
    assert novi_data._texto_publico("Nome 123.456.789-09") == "[dado omitido]"
    assert novi_data._texto_publico("Título <img src=x>") == "Título img src=x"


def test_aggregated_report_avoids_personal_rows(monkeypatch):
    db = DB(lambda q: SimpleNamespace(data=None, count=3))
    monkeypatch.setattr(novi_data, "supabase", db)
    answer, path = novi_data.consultar("indicadores", {"id": 9})
    assert "**3 empréstimos ativos**" in answer and path == "/admin/relatorios"
    assert all(q.head for q in db.calls)
    assert {q.table for q in db.calls} == {"Movimentacao", "MovimentacaoExemplar"}


def test_missing_count_fails_instead_of_reporting_zero(monkeypatch):
    monkeypatch.setattr(novi_data, "supabase", DB(lambda q: SimpleNamespace(data=[], count=None)))
    try:
        novi_data.consultar("contar_alunos", {"id": 9})
    except RuntimeError as exc:
        assert "Contagem exata" in str(exc)
    else:
        raise AssertionError("contagem ausente foi tratada como zero")


def test_accession_lookup_folds_accents_and_filters_available_copies(monkeypatch):
    def result(q):
        if q.table == "Livro" and q.start is None:
            return SimpleNamespace(data=[], count=0)
        if q.table == "Livro":
            return SimpleNamespace(data=[book(8, "Harry Potter e o Calice de Fogo")], count=None)
        return SimpleNamespace(data=[{"idLivro": 8, "exeLivTombo": "HP-017", "exeLivStatus": "Disponível"},
                                     {"idLivro": 8, "exeLivTombo": "HP-019", "exeLivStatus": "Emprestado"}], count=None)
    db = DB(result)
    monkeypatch.setattr(novi_data, "supabase", db)
    answer, path = novi_data.consultar("consultar_exemplares", {"id": 9}, "Cálice de Fogo", "disponiveis")
    assert "HP-017" in answer and "HP-019" not in answer
    assert "1 exemplar(es) disponível(is)" in answer and path == "/admin/biblioteca"
    assert db.calls[-1].columns == "idLivro,exeLivTombo,exeLivStatus"
    assert all(q.columns != "*" for q in db.calls)


def test_accession_lookup_multiple_titles_does_not_require_exact_title(monkeypatch):
    def result(q):
        if q.table == "Livro":
            return SimpleNamespace(data=[book(1, "Saga Um"), book(2, "Saga Dois")], count=2)
        return SimpleNamespace(data=[{"idLivro": 1, "exeLivTombo": "T-1", "exeLivStatus": "Disponível"},
                                     {"idLivro": 2, "exeLivTombo": "T-2", "exeLivStatus": "Disponível"}], count=None)
    monkeypatch.setattr(novi_data, "supabase", DB(result))
    answer, _ = novi_data.consultar("consultar_exemplares", {"id": 9}, "Saga", "disponiveis")
    assert "Saga Um" in answer and "T-1" in answer and "Saga Dois" in answer and "T-2" in answer


def test_accession_lookup_caps_output_and_discloses_truncation(monkeypatch):
    def result(q):
        if q.table == "Livro":
            return SimpleNamespace(data=[book(8, "Muitas cópias")], count=1)
        return SimpleNamespace(data=[{"idLivro": 8, "exeLivTombo": f"T-{i}", "exeLivStatus": "Disponível"}
                                     for i in range(9)], count=None)
    monkeypatch.setattr(novi_data, "supabase", DB(result))
    answer, _ = novi_data.consultar("consultar_exemplares", {"id": 9}, "Muitas", "disponiveis")
    assert "T-4" in answer and "T-5" not in answer and "mais 4 na tela" in answer
