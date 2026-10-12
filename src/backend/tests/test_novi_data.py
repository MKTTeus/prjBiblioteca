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

    def order(self, field):
        return self

    def limit(self, value):
        assert value <= 5
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
    assert novi_data.intent("Qual meu nome?") == "meu_nome"
    answer, route = novi_data.consultar("meu_nome", "Qual meu nome?", {"id": 9})
    assert "**Vitor**" in answer
    assert route == "/admin/configuracoes/geral"


def test_student_and_professor_counts_use_exact_filters(monkeypatch):
    db = DB(lambda q: SimpleNamespace(data=None, count=37 if q.table == "Usuario" else 4))
    monkeypatch.setattr(novi_data, "supabase", db)
    answer, _ = novi_data.consultar("contar_alunos", "Quantos alunos ativos?", {"id": 9})
    assert "37 alunos ativos" in answer
    assert db.calls[0].head and db.calls[0].columns == "idUsuario"
    assert {("eq", "usuTipo", "Aluno"), ("eq", "usuExcluido", False),
            ("eq", "usuStatus", True), ("eq", "usuFormado", False)} <= set(db.calls[0].filters)
    answer, _ = novi_data.consultar("contar_professores", "Quantos professores?", {"id": 9})
    assert "4 professores ativos" in answer
    assert {("eq", "admProfessor", True), ("eq", "admStatus", True)} <= set(db.calls[1].filters)


def test_book_lookup_returns_only_selected_fields_and_limits_result(monkeypatch):
    db = DB(lambda q: (SimpleNamespace(data=[{
        "idLivro": 8, "livTitulo": "Dom Casmurro", "livISBN": "123", "livPaginas": 200,
        "livAnoPublicacao": 1899, "livAtivo": True,
    }], count=None) if q.table == "Livro" else SimpleNamespace(data=None, count=2)))
    monkeypatch.setattr(novi_data, "supabase", db)
    assert novi_data.intent("Tem o livro Dom Casmurro?") == "consultar_livros"
    answer, path = novi_data.consultar("consultar_livros", "Tem o livro Dom Casmurro?", {"id": 9})
    assert "**Dom Casmurro**" in answer and "2 exemplares" in answer
    assert path == "/admin/biblioteca"
    assert db.calls[0].columns == "idLivro,livTitulo,livISBN,livPaginas,livAnoPublicacao,livAtivo"
    assert ("ilike", "livTitulo", "%Dom Casmurro%") in db.calls[0].filters
    assert all(q.table in ("Livro", "Exemplar") for q in db.calls)


def test_natural_book_title_query_and_general_total_are_distinct(monkeypatch):
    assert novi_data.intent("Há algum livro com o título Harry Potter?") == "consultar_livros"
    assert novi_data._termo_livro("Há algum livro com o título Harry Potter?") == "Harry Potter"
    assert novi_data.intent("Quantos livros há no acervo?") == "contar_livros"
    assert novi_data._termo_livro("Quantos livros há no acervo?") is None

    db = DB(lambda q: SimpleNamespace(data=[], count=None))
    monkeypatch.setattr(novi_data, "supabase", db)
    answer, path = novi_data.consultar("consultar_livros", "Há algum livro com o título Harry Potter?", {"id": 9})
    assert "Não encontrei título" in answer and path == "/admin/biblioteca"
    assert ("ilike", "livTitulo", "%Harry Potter%") in db.calls[0].filters


def test_missing_search_title_prompts_for_title_without_listing_everything(monkeypatch):
    monkeypatch.setattr(novi_data, "supabase", DB(lambda q: (_ for _ in ()).throw(AssertionError("database called"))))
    answer, _ = novi_data.consultar("consultar_livros", "Há algum livro com o título?", {"id": 9})
    assert "Qual é o título" in answer


def test_books_without_copies_uses_anti_join_and_exact_count(monkeypatch):
    db = DB(lambda q: SimpleNamespace(data=[{"idLivro": 8, "livTitulo": "Livro sem cópia"}], count=1))
    monkeypatch.setattr(novi_data, "supabase", db)
    assert novi_data.intent("Há algum livro sem exemplar cadastrado?") == "livros_sem_exemplar"
    answer, path = novi_data.consultar("livros_sem_exemplar", "Há algum livro sem exemplar cadastrado?", {"id": 9})
    assert "**1 título sem exemplar cadastrado**" in answer
    assert "**Livro sem cópia**" in answer and path == "/admin/livros"
    assert db.calls[0].columns == "idLivro,livTitulo,Exemplar()"
    assert ("is", "Exemplar", "null") in db.calls[0].filters


def test_inactive_book_does_not_claim_public_availability(monkeypatch):
    def result(q):
        if q.table == "Livro":
            return SimpleNamespace(data=[{"idLivro": 8, "livTitulo": "Exemplo", "livAtivo": False}], count=None)
        assert not any(f[1] == "exeLivStatus" for f in q.filters)
        return SimpleNamespace(data=None, count=2)
    db = DB(result)
    monkeypatch.setattr(novi_data, "supabase", db)
    answer, _ = novi_data.consultar("consultar_livros", "Tem o livro Exemplo?", {"id": 9})
    assert "desativado no catálogo" in answer
    assert "disponíveis" not in answer.split("\n")[0]


def test_public_book_text_omits_embedded_personal_data():
    assert novi_data._texto_publico("Nome 123.456.789-09") == "[dado omitido]"
    assert novi_data._texto_publico("Título <img src=x>") == "Título img src=x"


def test_aggregated_report_avoids_personal_rows(monkeypatch):
    db = DB(lambda q: SimpleNamespace(data=None, count=3))
    monkeypatch.setattr(novi_data, "supabase", db)
    answer, path = novi_data.consultar("indicadores", "Resumo dos relatórios", {"id": 9})
    assert "**3 empréstimos ativos**" in answer and path == "/admin/relatorios"
    assert all(q.head for q in db.calls)
    assert {q.table for q in db.calls} == {"Movimentacao", "MovimentacaoExemplar"}


def test_missing_count_fails_instead_of_reporting_zero(monkeypatch):
    monkeypatch.setattr(novi_data, "supabase", DB(lambda q: SimpleNamespace(data=[], count=None)))
    try:
        novi_data.consultar("contar_alunos", "Quantos alunos?", {"id": 9})
    except RuntimeError as exc:
        assert "Contagem exata" in str(exc)
    else:
        raise AssertionError("contagem ausente foi tratada como zero")
