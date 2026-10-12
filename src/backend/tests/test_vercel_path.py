import asyncio
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from vercel_path import VercelRewritePathMiddleware


def run_middleware(middleware, scope):
    forwarded = {}
    messages = []

    async def app(received_scope, receive, send):
        forwarded.update(received_scope)

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        messages.append(message)

    asyncio.run(middleware(app)(scope, receive, send))
    return forwarded, messages


def test_vercel_rewrite_restores_api_path_and_preserves_query(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    scope = {
        "type": "http",
        "path": "/api/index.py",
        "raw_path": b"/api/index.py",
        "query_string": b"__vercel_path=novi%2Fperguntar&page=2",
    }

    forwarded, _ = run_middleware(VercelRewritePathMiddleware, scope)

    assert forwarded["path"] == "/api/novi/perguntar"
    assert forwarded["raw_path"] == b"/api/novi/perguntar"
    assert forwarded["query_string"] == b"page=2"


def test_vercel_rewrite_supports_api_root(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    scope = {
        "type": "http",
        "path": "/api/index.py",
        "raw_path": b"/api/index.py",
        "query_string": b"__vercel_path=",
    }

    forwarded, _ = run_middleware(VercelRewritePathMiddleware, scope)

    assert forwarded["path"] == "/api"


def test_vercel_rewrite_rejects_traversal(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    scope = {
        "type": "http",
        "path": "/api/index.py",
        "raw_path": b"/api/index.py",
        "query_string": b"__vercel_path=..%2Fprivate",
    }

    forwarded, messages = run_middleware(VercelRewritePathMiddleware, scope)

    assert not forwarded
    assert messages[0]["status"] == 400
