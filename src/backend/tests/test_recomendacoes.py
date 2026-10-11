from pathlib import Path
import sys
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from recommendations.engine import recomendar, afinidade
from recommendations import repository
from routers import recomendacoes as api
import core


def book(lid, **kwargs):
    return {'idLivro': lid, 'livTitulo': f'Livro {lid}', 'livDescricao': '',
            'livAtivo': True, 'disponiveis': 1, **kwargs}


def history(uid, lid, nota=None, **kwargs):
    return {'idUsuario': uid, 'idLivro': lid, 'nota': nota, 'consumido': True,
            'devolvido': True, 'bloqueado': False, 'devolvidoEm': '2026-01-01', **kwargs}


def ids(result):
    return [item['livro']['idLivro'] for item in result]


def test_hybrid_requires_two_peers_and_excludes_consumed_pending_unavailable():
    books = [book(i) for i in range(1, 9)]
    books[5]['livAtivo'] = False
    books[6]['disponiveis'] = 0
    hist = [history(1, 1, 5), history(1, 2, consumido=False, devolvido=False, bloqueado=True),
            history(1, 3, devolvido=False, bloqueado=True)]
    for uid in (2, 3):
        hist += [history(uid, 1, 5), history(uid, 4, 5), history(uid, 6), history(uid, 7)]
    result = recomendar(books, hist, 1)
    assert ids(result)[0] == 4
    assert result[0]['estrategia'] == 'hibrida'
    assert not set(ids(result)) & {1, 2, 3, 6, 7}
    one_peer = recomendar(books, [h for h in hist if h['idUsuario'] != 3], 1)
    assert all(r['estrategia'] != 'hibrida' for r in one_peer)
    assert all(set(r) == {'livro', 'motivo', 'estrategia'} for r in result)


def test_content_fallback_and_negative_rating_change_ranking():
    books = [book(1, livPalavrasChave='dragão magia'), book(2, livPalavrasChave='robôs circuitos'),
             book(3, livPalavrasChave='dragão magia'), book(4, livPalavrasChave='robôs circuitos')]
    assert ids(recomendar(books, [history(1, 1, 5), history(1, 2, 1)], 1))[0] == 3
    assert ids(recomendar(books, [history(1, 1, 1), history(1, 2, 5)], 1))[0] == 4
    assert afinidade(None) > 0 and afinidade(3) == 0 and afinidade(1) < 0


def test_cold_start_empty_metadata_and_duplicate_loans():
    books = [book(1), book(2)]
    hist = [history(2, 2, 5)]
    result = recomendar(books, hist, 1)
    assert ids(result) == [2, 1]
    assert result[0]['estrategia'] == 'descoberta'
    assert result == recomendar(books, hist * 4, 1)
    assert recomendar([], [], 1) == []
    assert ids(recomendar(books, [], 1, limite=1)) == [1]


def test_ratings_do_not_create_history_and_neutral_is_not_positive():
    books = [book(1), book(2)]
    assert recomendar(books, [history(2, 2, 5, consumido=False, devolvido=False)], 1) == recomendar(books, [], 1)
    assert ids(recomendar(books, [history(2, 2, 3)], 1)) == [1, 2]


@pytest.fixture
def client(monkeypatch):
    app = FastAPI()
    app.include_router(api.router)
    monkeypatch.setattr(core, '_authenticate', lambda token: {'id': 7, 'tipo': token, 'senhaProvisoria': False})
    return TestClient(app)


@pytest.mark.parametrize('path', ['/aluno/recomendacoes', '/aluno/avaliacoes', '/aluno/recomendacoes/painel'])
def test_routes_require_student_and_auth(client, path):
    assert client.get(path).status_code == 401
    for tipo in ('Comunidade', 'admin'):
        assert client.get(path, headers={'Authorization': f'Bearer {tipo}'}).status_code == 403


def test_rating_uses_session_identity_and_validates_input(client, monkeypatch):
    calls = []
    monkeypatch.setattr(api, 'executar_rpc', lambda name, params: calls.append((name, params)) or {'nota': params['p_nota']})
    headers = {'Authorization': 'Bearer Aluno'}
    for nota in (0, 6, 4.5, True, '5', None):
        assert client.put('/aluno/avaliacoes/3', json={'nota': nota}, headers=headers).status_code == 422
    assert client.put('/aluno/avaliacoes/3', json={'nota': 5, 'idUsuario': 99}, headers=headers).status_code == 422
    assert client.put('/aluno/avaliacoes/3', json={'nota': 5}, headers={'Authorization': 'Bearer Comunidade'}).status_code == 403
    response = client.put('/aluno/avaliacoes/3', json={'nota': 5}, headers=headers)
    assert response.status_code == 200 and response.headers['cache-control'] == 'private, no-store'
    assert calls == [('avaliar_livro', {'p_usuario': 7, 'p_livro': 3, 'p_nota': 5})]


def test_recommendations_no_peer_data_and_limit(client, monkeypatch):
    monkeypatch.setattr(api, 'carregar_catalogo', lambda: [book(1), book(2)])
    monkeypatch.setattr(api, 'carregar_historico', lambda: [history(77, 2)])
    headers = {'Authorization': 'Bearer Aluno'}
    response = client.get('/aluno/recomendacoes?limite=1&idUsuario=77', headers=headers)
    assert response.status_code == 200
    assert ids(response.json()['itens']) == [2]
    assert 'idUsuario' not in response.text
    assert client.get('/aluno/recomendacoes?limite=100', headers=headers).status_code == 422


def test_panel_reuses_catalog_and_history_for_recommendations_and_ratings(client, monkeypatch):
    calls = {'catalogo': 0, 'historico': 0}
    livros = [book(1), book(2)]
    historico = [history(7, 1, 5)]
    def catalogo(): calls['catalogo'] += 1; return livros
    def history_all(): calls['historico'] += 1; return historico
    monkeypatch.setattr(api, 'carregar_catalogo', catalogo)
    monkeypatch.setattr(api, 'carregar_historico', history_all)
    response = client.get('/aluno/recomendacoes/painel', headers={'Authorization': 'Bearer Aluno'})
    assert response.status_code == 200
    assert response.json()['avaliacoes'][0]['idLivro'] == 1
    assert calls == {'catalogo': 1, 'historico': 1}


def test_provisional_password_is_rejected(client, monkeypatch):
    monkeypatch.setattr(core, '_authenticate', lambda _: {'id': 7, 'tipo': 'Aluno', 'senhaProvisoria': True})
    assert client.get('/aluno/recomendacoes', headers={'Authorization': 'Bearer Aluno'}).status_code == 403


def test_history_paginates_after_100_rows(monkeypatch):
    rows = [history(i, i) for i in range(205)]
    ranges = []
    class Query:
        def select(self, *_): return self
        def order(self, *_): return self
        def eq(self, *_): return self
        def range(self, start, end): self.start, self.end = start, end; ranges.append((start, end)); return self
        def execute(self): return SimpleNamespace(data=rows[self.start:self.end+1])
    monkeypatch.setattr(repository, 'supabase', SimpleNamespace(table=lambda _: Query()))
    assert len(repository.carregar_historico()) == 205
    assert len(ranges) == 3


def test_catalog_counts_only_exact_available_status(monkeypatch):
    expected = book(1, disponiveis=1, exemplares_cadastrados=5, total_exemplares=4)
    monkeypatch.setattr(repository, 'executar_rpc', lambda name, params: {'itens': [expected], 'total': 1})
    result = repository.carregar_catalogo()[0]
    assert result['disponiveis'] == 1
    assert result['exemplares_cadastrados'] == 5
    assert result['total_exemplares'] == 4


def test_rating_list_is_scoped_to_authenticated_student(client, monkeypatch):
    calls = []
    monkeypatch.setattr(api, 'livros_avaliaveis', lambda uid: calls.append(uid) or [])
    response = client.get('/aluno/avaliacoes?idUsuario=999', headers={'Authorization': 'Bearer Aluno'})
    assert response.status_code == 200 and response.json() == []
    assert calls == [7]
