from types import SimpleNamespace
from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from routers import livros


class Query:
    def __init__(self, rows):
        self.rows = list(rows)

    def select(self, *args, **kwargs): return self
    def order(self, *args): return self
    def eq(self, key, value):
        self.rows = [r for r in self.rows if r.get(key) == value]
        return self
    def in_(self, key, values):
        self.rows = [r for r in self.rows if r.get(key) in values]
        return self
    def range(self, start, end):
        self.rows = self.rows[start:end + 1]
        return self
    def execute(self): return SimpleNamespace(data=self.rows, count=len(self.rows))


def acervo(monkeypatch):
    tabelas = {
        "Livro": [{"idLivro": i, "livTitulo": t, "livAtivo": True} for i, t in (
            (1, "Memórias Póstumas de Brás Cubas"), (2, "O Pequeno Príncipe"),
            (3, "Dom Casmurro"), (4, "Coração das Trevas"))],
        "Autor": [{"idAutor": 10, "autNome": "Machado de Assis"}, {"idAutor": 11, "autNome": "Antoine de Saint-Exupéry"}],
        "LivroAutor": [{"idLivro": 1, "idAutor": 10}, {"idLivro": 3, "idAutor": 10}, {"idLivro": 2, "idAutor": 11}],
        "Exemplar": [{"idLivro": 1, "exeLivTombo": "T-001"}, {"idLivro": 2, "exeLivTombo": "T-002"},
                     {"idLivro": 3, "exeLivTombo": "T-003"}, {"idLivro": 4, "exeLivTombo": "T-004"}],
    }
    chamadas = []
    def tabela(nome):
        chamadas.append(nome)
        return Query(tabelas[nome])
    monkeypatch.setattr(livros, "supabase", SimpleNamespace(table=tabela))
    monkeypatch.setattr(livros, "enriquecer_livros", lambda rows: rows)
    return chamadas


def ids(**kwargs):
    return sorted(b["idLivro"] for b in livros._listar_livros(**kwargs))


def test_busca_ignora_acentos_caixa_e_pontuacao(monkeypatch):
    acervo(monkeypatch)
    assert ids(q="memorias postumas") == [1]
    assert ids(q="PRÍNCIPE") == [2]
    assert ids(q="coracao trevas") == [4]
    assert ids(q="saint exupery") == [2]      # por autor, sem acento nem hífen
    assert ids(q="machado") == [1, 3]


def test_busca_por_tombo_ignora_hifen_e_so_le_tombos_quando_ha_numero(monkeypatch):
    chamadas = acervo(monkeypatch)
    assert ids(q="t003") == [3]
    assert ids(q="T-002") == [2]
    leituras_codigo = chamadas.count("Exemplar")
    chamadas.clear()
    assert ids(q="casmurro") == [3]
    # busca por texto dispensa a leitura de todos os tombos (as demais leituras de
    # Exemplar são das contagens de cada livro, que acontecem nos dois casos)
    assert chamadas.count("Exemplar") < leituras_codigo / 2


def test_erro_de_digitacao_so_e_tolerado_sem_resultado_exato(monkeypatch):
    acervo(monkeypatch)
    assert ids(q="casmuro") == [3]
    assert ids(q="pricipe") == [2]
    assert ids(q="xadrez") == []
    # com resultado exato, o aproximado não polui a lista
    assert ids(q="dom") == [3]


def catalogo_api(monkeypatch, itens):
    app = FastAPI()
    app.include_router(livros.router)
    chamadas = []
    def rpc(nome, params):
        chamadas.append(params)
        busca = (params.get("p_busca") or "").strip()
        if busca:  # o SQL só acha correspondência exata (já sem acentos)
            achados = [i for i in itens if busca.casefold() in i["livTitulo"].casefold()]
        else:
            achados = list(itens)
        inicio = (params["p_pagina"] - 1) * params["p_por_pagina"]
        return {"itens": achados[inicio:inicio + params["p_por_pagina"]], "total": len(achados)}
    monkeypatch.setattr(livros, "executar_rpc", rpc)
    return TestClient(app), chamadas


ITENS = [{"idLivro": 1, "livTitulo": "Dom Casmurro", "livAutor": "Machado de Assis", "livGenero": "Romance"},
         {"idLivro": 2, "livTitulo": "O Pequeno Príncipe", "livAutor": "Antoine de Saint-Exupéry", "livGenero": "Fábula"}]


def test_catalogo_com_resultado_exato_nao_aciona_busca_aproximada(monkeypatch):
    api, chamadas = catalogo_api(monkeypatch, ITENS)
    resposta = api.get("/livros/catalogo", params={"q": "casmurro"}).json()
    assert [i["idLivro"] for i in resposta["itens"]] == [1] and "aproximado" not in resposta
    assert len(chamadas) == 1


def test_catalogo_sem_resultado_exato_tenta_erro_de_digitacao_e_sinaliza(monkeypatch):
    api, chamadas = catalogo_api(monkeypatch, ITENS)
    resposta = api.get("/livros/catalogo", params={"q": "casmuro"}).json()
    assert [i["idLivro"] for i in resposta["itens"]] == [1]
    assert resposta["total"] == 1 and resposta["aproximado"] is True
    assert chamadas[1]["p_busca"] is None  # segunda leitura traz o catálogo para comparar


def test_catalogo_sem_nenhuma_correspondencia_mantem_resposta_vazia(monkeypatch):
    api, _ = catalogo_api(monkeypatch, ITENS)
    resposta = api.get("/livros/catalogo", params={"q": "xadrez"}).json()
    assert resposta == {"itens": [], "total": 0}


def test_catalogo_sem_busca_nao_faz_segunda_leitura(monkeypatch):
    api, chamadas = catalogo_api(monkeypatch, ITENS)
    assert api.get("/livros/catalogo").json()["total"] == 2
    assert len(chamadas) == 1
