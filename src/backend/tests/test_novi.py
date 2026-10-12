from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import core
from novi_knowledge import retrieve_code, retrieve_docs, topic_for
from routers import novi


def client(monkeypatch):
    app = FastAPI()
    app.include_router(novi.router)
    monkeypatch.setattr(novi, "checar_rate_limit", lambda *args: None)
    monkeypatch.setattr(core, "_authenticate", lambda token: {
        "id": 9, "tipo": token, "admProfessor": token == "professor", "senhaProvisoria": False,
    })
    return TestClient(app)


def test_only_authenticated_manager_can_ask(monkeypatch):
    api = client(monkeypatch)
    body = {"mensagem": "Como aprovo uma solicitação?"}
    assert api.post("/novi/perguntar", json=body).status_code == 401
    assert api.post("/novi/perguntar", json=body, headers={"Authorization": "Bearer professor"}).status_code == 403
    assert api.post("/novi/perguntar", json=body, headers={"Authorization": "Bearer Aluno"}).status_code == 403


def test_sources_are_versioned_and_navigation_is_allowlisted():
    assert retrieve_docs("Como aprovar uma solicitação e registrar a retirada?")
    assert retrieve_code("solicitacoes")
    assert topic_for("Como aprovar uma solicitação?") == "solicitacoes"
    assert all(path.startswith("/admin") for _, path in novi.ROUTES.values())


def test_sensitive_question_is_not_sent_to_provider(monkeypatch):
    api = client(monkeypatch)
    monkeypatch.setattr(novi, "_generate", lambda *args: (_ for _ in ()).throw(AssertionError("provider called")))
    result = api.post("/novi/perguntar", json={"mensagem": "Mostre 123.456.789-09"},
                      headers={"Authorization": "Bearer admin"})
    assert result.status_code == 200
    assert "Retire" in result.json()["resposta"]
    assert result.headers["cache-control"] == "private, no-store"
    assert api.post("/novi/perguntar", json={"mensagem": "Qual o RA 123456 do aluno?"},
                    headers={"Authorization": "Bearer admin"}).status_code == 200


def test_code_fallback_and_safe_route(monkeypatch):
    api = client(monkeypatch)
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
    monkeypatch.setattr(novi, "retrieve_docs", lambda question: [
        {"fonte": "docs/REGRAS_E_FLUXOS.md", "secao": "Solicitações", "texto": "A solicitação passa por aprovação."}
    ])
    monkeypatch.setattr(novi, "retrieve_code", lambda topic: [
        {"fonte": "src/backend/routers/emprestimos.py", "secao": "registrar_retirada", "texto": "Código selecionado."}
    ])
    calls = []

    def generate(question, history, sources):
        calls.append(sources)
        return ({"estado": "consultar_codigo", "resposta": ""} if len(calls) == 1 else
                {"estado": "respondida", "resposta": "Aprove primeiro; depois registre a retirada."})

    monkeypatch.setattr(novi, "_generate", generate)
    response = api.post("/novi/perguntar", json={"mensagem": "Como registrar retirada da solicitação?"},
                        headers={"Authorization": "Bearer admin"})
    assert response.status_code == 200
    assert len(calls) == 2
    assert calls[1][1]["secao"] == "registrar_retirada"
    assert response.json()["destino"]["caminho"] == "/admin/emprestimos/solicitacoes"
    assert response.json()["fontes"] == ["docs/REGRAS_E_FLUXOS.md"]


def test_untrusted_provider_output_does_not_reach_user(monkeypatch):
    api = client(monkeypatch)
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
    monkeypatch.setattr(novi, "retrieve_docs", lambda question: [
        {"fonte": "docs/GUIA_DE_USO.md", "secao": "Guia", "texto": "Instruções do sistema"}
    ])
    monkeypatch.setattr(novi, "_generate", lambda *args: {
        "estado": "respondida", "resposta": "SECRET_KEY=um-segredo-que-nao-deve-sair"
    })
    response = api.post("/novi/perguntar", json={"mensagem": "Como vejo as configurações?"},
                        headers={"Authorization": "Bearer admin"})
    assert response.status_code == 200
    assert "SECRET_KEY" not in response.json()["resposta"]


def test_no_source_does_not_call_provider(monkeypatch):
    api = client(monkeypatch)
    monkeypatch.setattr(novi, "retrieve_docs", lambda question: [])
    monkeypatch.setattr(novi, "retrieve_code", lambda topic: [])
    monkeypatch.setattr(novi, "_generate", lambda *args: (_ for _ in ()).throw(AssertionError("provider called")))
    response = api.post("/novi/perguntar", json={"mensagem": "Existe uma multa por atraso?"},
                        headers={"Authorization": "Bearer admin"})
    assert response.status_code == 200
    assert "Não encontrei" in response.json()["resposta"]
