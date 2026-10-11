from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import sys
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import database


def configured_client(monkeypatch, handler):
    # Usa o SDK real, substituindo somente a rede por respostas controladas.
    for name in ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy'):
        monkeypatch.delenv(name, raising=False)
    original_factory = httpx.Client
    captured = {}

    def factory(**kwargs):
        captured.update(kwargs)
        return original_factory(**kwargs, transport=httpx.MockTransport(handler))

    # O SDK usa sua referência própria a Client; este patch captura apenas
    # a sessão REST que database.py constrói explicitamente.
    monkeypatch.setattr(database.httpx, 'Client', factory)
    monkeypatch.setattr(database, 'SUPABASE_URL', 'https://example.supabase.co')
    monkeypatch.setattr(database, 'SUPABASE_KEY', 'test-backend-key')
    client = database._criar_cliente()
    assert not isinstance(client, database.SupabaseNaoConfigurado)
    return client, captured


def test_http1_queries_keep_auth_schema_count_ranges_and_parallel_reads(monkeypatch):
    barrier = Barrier(4, timeout=5)
    requests = []

    def handler(request):
        requests.append(request)
        barrier.wait()
        offset = int(request.url.params['offset'])
        return httpx.Response(206, json=[{'idLivro': offset + 1}],
                              headers={'Content-Range': f'{offset}-{offset}/334'})

    client, config = configured_client(monkeypatch, handler)
    try:
        assert config['http2'] is False
        assert config['verify'] is True
        assert config['follow_redirects'] is True
        assert config['timeout'] == client.options.postgrest_client_timeout
        # Nenhuma substituição do cliente compartilhado de Auth/Storage.
        assert client.options.httpx_client is None
        assert client.storage._client is not client.postgrest.session

        def query(offset):
            return client.table('Livro').select('idLivro', count='exact').order('idLivro').range(offset, offset).execute()

        with ThreadPoolExecutor(max_workers=4) as executor:
            results = list(executor.map(query, [0, 100, 200, 300]))
        assert [r.data[0]['idLivro'] for r in results] == [1, 101, 201, 301]
        assert all(r.count == 334 for r in results)
        assert len(requests) == 4
        for request in requests:
            assert request.headers['apikey'] == 'test-backend-key'
            assert request.headers['authorization'] == 'Bearer test-backend-key'
            assert request.headers['accept-profile'] == 'public'
            assert request.headers['prefer'] == 'count=exact'
            assert request.url.scheme == 'https'
    finally:
        client.postgrest.session.close()


def test_transport_does_not_repeat_mutations_on_protocol_error(monkeypatch):
    calls = []

    def handler(request):
        calls.append(request)
        raise httpx.RemoteProtocolError('simulated failure')

    client, _ = configured_client(monkeypatch, handler)
    try:
        with pytest.raises(httpx.RemoteProtocolError):
            client.rpc('salvar_livro', {'p_id': 1}).execute()
        assert len(calls) == 1
        assert calls[0].method == 'POST'
        assert calls[0].headers['content-profile'] == 'public'
    finally:
        client.postgrest.session.close()
