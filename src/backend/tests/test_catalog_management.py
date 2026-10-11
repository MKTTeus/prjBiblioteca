from types import SimpleNamespace
import json
import logging
import pytest
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core import get_admin
from routers import livros


class Query:
    def __init__(self, rows):
        self.rows = list(rows)

    def select(self, *args, **kwargs): return self
    def order(self, *args): return self
    def eq(self, key, value):
        self.rows = [row for row in self.rows if row.get(key) == value]
        return self
    def in_(self, key, values):
        self.rows = [row for row in self.rows if row.get(key) in values]
        return self
    def range(self, start, end):
        self.rows = self.rows[start:end + 1]
        return self
    def execute(self): return SimpleNamespace(data=self.rows)


def catalog(monkeypatch):
    tables = {
        'Livro': [{'idLivro': i, 'livTitulo': title, 'livAtivo': active} for i, title, active in (
            (1, 'Sem cópias', True), (2, 'Cópias desativadas', True),
            (3, 'Em circulação', True), (4, 'Título inativo', False))],
        'Exemplar': [
            {'idExemplar': 1, 'idLivro': 2, 'exeLivStatus': 'Desativado'},
            {'idExemplar': 2, 'idLivro': 3, 'exeLivStatus': 'Emprestado'},
            {'idExemplar': 3, 'idLivro': 3, 'exeLivStatus': 'Reservado'},
            {'idExemplar': 4, 'idLivro': 4, 'exeLivStatus': 'Disponível'},
        ],
    }
    monkeypatch.setattr(livros, 'supabase', SimpleNamespace(table=lambda table: Query(tables[table])))
    monkeypatch.setattr(livros, 'enriquecer_livros', lambda rows: rows)
    app = FastAPI()
    app.include_router(livros.router)
    return app, tables


def test_management_requires_manager(monkeypatch):
    app, _ = catalog(monkeypatch)
    assert TestClient(app).get('/livros/gestao').status_code in (401, 403)


def test_manager_sees_missing_and_disabled_copies_but_public_catalog_does_not(monkeypatch):
    app, _ = catalog(monkeypatch)
    app.dependency_overrides[get_admin] = lambda: {'tipo': 'admin', 'admProfessor': False}
    client = TestClient(app)
    public = client.get('/livros').json()
    assert [book['idLivro'] for book in public] == [3]
    result = client.get('/livros/gestao')
    assert result.status_code == 200
    books = {book['idLivro']: book for book in result.json()}
    assert set(books) == {1, 2, 3, 4}
    assert books[1]['exemplares_cadastrados'] == books[1]['total_exemplares'] == 0
    assert books[2]['exemplares_cadastrados'] == books[2]['exemplares_desativados'] == 1
    assert books[2]['total_exemplares'] == 0
    assert books[3]['total_exemplares'] == 2  # Empréstimo/reserva não é pendência de cadastro.


def test_adding_a_copy_makes_missing_title_visible_again(monkeypatch):
    app, tables = catalog(monkeypatch)
    client = TestClient(app)
    assert 1 not in [book['idLivro'] for book in client.get('/livros').json()]
    tables['Exemplar'].append({'idExemplar': 5, 'idLivro': 1, 'exeLivStatus': 'Disponível'})
    assert 1 in [book['idLivro'] for book in client.get('/livros').json()]


@pytest.mark.parametrize('failure,stage', [
    ('Livro', 'livros'), ('Exemplar', 'exemplares'), ('relations', 'relacionamentos'),
])
def test_catalog_error_has_safe_diagnostics_and_preserves_response(monkeypatch, caplog, failure, stage):
    app, tables = catalog(monkeypatch)
    app.dependency_overrides[get_admin] = lambda: {'tipo': 'admin'}

    @app.middleware('http')
    async def request_id(request, call_next):
        request.state.request_id = 'generated-request-id'
        return await call_next(request)

    secret = 'private-token-and-email@example.com'

    def fail():
        try:
            raise ConnectionError('https://example.com/?token=' + secret)
        except ConnectionError as cause:
            raise RuntimeError(secret) from cause

    def table(name):
        if name == failure:
            fail()
        return Query(tables[name])

    monkeypatch.setattr(livros, 'supabase', SimpleNamespace(table=table))
    if failure == 'relations':
        monkeypatch.setattr(livros, 'enriquecer_livros', lambda rows: fail())

    with caplog.at_level(logging.ERROR, logger='biblioteca.catalogo'):
        response = TestClient(app).get('/livros/gestao')

    assert response.status_code == 500
    assert response.json() == {'detail': 'Erro ao listar livros'}
    record, = [r for r in caplog.records if r.name == 'biblioteca.catalogo']
    assert record.exc_info is None  # A mensagem bruta da exceção não pode vazar.
    assert secret not in record.getMessage()
    assert 'https://' not in record.getMessage()
    diagnostic = json.loads(record.getMessage().removeprefix('catalog_error '))
    assert diagnostic['request_id'] == 'generated-request-id'
    assert diagnostic['etapa'] == stage
    assert diagnostic['duracao_ms'] >= 0
    assert [cause['tipo'] for cause in diagnostic['causas']] == ['RuntimeError', 'ConnectionError']
    assert diagnostic['causas'][0]['frames'][-1]['funcao'] == 'fail'
    assert diagnostic['causas'][0]['frames'][-1]['linha'] > 0
