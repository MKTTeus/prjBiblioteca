from threading import Barrier
from types import SimpleNamespace

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import core
from routers import dashboard, livros


def test_catalog_fetches_all_pages_concurrently_without_losing_titles(monkeypatch):
    barrier = Barrier(3, timeout=5)
    rows = [{"idLivro": i, "livAtivo": True} for i in range(340)]

    class Query:
        def __init__(self, table):
            self.table = table
            self.rows = rows if table == "Livro" else []

        def select(self, *args, **kwargs): return self
        def order(self, *args): return self
        def eq(self, *args): return self
        def in_(self, *args): return self
        def range(self, start, end):
            self.start, self.end = start, end
            return self

        def execute(self):
            if self.table == "Livro" and self.start in (100, 200, 300):
                barrier.wait()
            return SimpleNamespace(data=self.rows[self.start:self.end + 1], count=len(self.rows))

    monkeypatch.setattr(livros, "supabase", SimpleNamespace(table=lambda name: Query(name)))
    monkeypatch.setattr(livros, "enriquecer_livros", lambda result: result)
    result = livros._listar_livros(incluir_sem_exemplares=True)
    assert [item["idLivro"] for item in result] == list(range(340))
    assert all(item["exemplares_cadastrados"] == 0 for item in result)


def test_exemplars_keep_every_page_with_multiple_book_batches():
    copies = [{"idLivro": book, "idExemplar": book * 4 + copy}
              for book in range(240) for copy in range(4)]

    class Query:
        def __init__(self, batch):
            self.rows = [copy for copy in copies if copy["idLivro"] in batch]

        def order(self, *args): return self
        def range(self, start, end):
            self.start, self.end = start, end
            return self
        def execute(self):
            return SimpleNamespace(data=self.rows[self.start:self.end + 1])

    result = livros.consultar_em_lotes(Query, list(range(240)), "idExemplar")
    assert len(result) == 960
    assert [copy["idExemplar"] for copy in result] == [copy["idExemplar"] for copy in copies]


def test_login_token_waits_for_both_security_and_timeout_reads(monkeypatch):
    barrier = Barrier(2, timeout=5)

    def minutes():
        barrier.wait()
        return 30

    def epoch():
        barrier.wait()
        return "current-epoch"

    monkeypatch.setattr(core, "get_session_timeout_minutes", minutes)
    monkeypatch.setattr(core, "get_session_epoch", epoch)
    from jose import jwt

    token = core.create_token({"sub": "user@example.com", "tipo": "Aluno"}, token_version=4)
    payload = jwt.decode(token, core.SECRET_KEY, algorithms=[core.ALGORITHM])
    assert payload["epoch"] == "current-epoch"
    assert payload["tv"] == 4


def test_dashboard_keeps_all_seven_counts_and_filters(monkeypatch):
    barrier = Barrier(7, timeout=5)
    calls = []

    class Query:
        def __init__(self, table):
            self.table = table
            self.filters = []

        def select(self, *args, **kwargs): return self
        def eq(self, key, value):
            self.filters.append((key, value))
            return self
        def is_(self, key, value):
            self.filters.append((key, value))
            return self
        def lt(self, key, value):
            self.filters.append((key, "<", value))
            return self
        def execute(self):
            barrier.wait()
            calls.append((self.table, tuple(self.filters)))
            return SimpleNamespace(count=1)

    monkeypatch.setattr(dashboard, "supabase", SimpleNamespace(table=lambda name: Query(name)))
    result = dashboard.dashboard_stats(user=None)
    assert set(result) == {"totalLivros", "totalUsuarios", "emprestimosAtivos",
                           "devolucoesPendentes", "reservados", "atrasados", "devolucoesHoje"}
    assert all(value == 1 for value in result.values())
    assert len(calls) == 7
    assert ("Livro", (("livAtivo", True),)) in calls
