from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import json

import pytest

import busca

CASOS = json.loads((Path(__file__).resolve().parents[2] / "utils" / "buscaCasos.json").read_text(encoding="utf-8"))


def test_normalizar_ignora_acentos_caixa_e_pontuacao():
    assert busca.normalizar("  João   D'Ávila-Çã!  ") == "joao davilaca"
    assert busca.normalizar("123.456.789-09") == "12345678909"
    assert busca.normalizar(None) == ""


def test_acentos_e_cedilha_nao_impedem_encontrar():
    livros = ["A Hora da Estrela", "Memórias Póstumas de Brás Cubas", "O Pequeno Príncipe"]
    for digitado, esperado in (("memorias postumas", 1), ("MEMÓRIAS", 1), ("principe", 2), ("estrêla", 0), ("bras", 1)):
        achados, aproximado = busca.filtrar(livros, digitado, lambda t: [t])
        assert achados == [livros[esperado]] and not aproximado, digitado


def test_palavras_em_qualquer_ordem_e_entre_campos():
    itens = [{"nome": "Maria Souza", "turma": "7A"}, {"nome": "Mario Souza", "turma": "8B"}]
    achados, _ = busca.filtrar(itens, "souza 7a", lambda i: [i["nome"], i["turma"]])
    assert achados == [itens[0]]


def test_codigos_ignoram_pontuacao():
    itens = ["T-001", "T-002"]
    assert busca.filtrar(itens, "t001", lambda t: [t])[0] == ["T-001"]
    assert busca.filtrar(["123.456.789-09"], "123456", lambda t: [t])[0] == ["123.456.789-09"]


def test_erro_de_digitacao_so_entra_quando_nao_ha_resultado_exato():
    livros = ["Dom Casmurro", "Harry Potter e a Pedra Filosofal"]
    for digitado, esperado in (("casmuro", 0), ("potter harri", 1), ("filosofl", 1), ("hary poter", 1)):
        achados, aproximado = busca.filtrar(livros, digitado, lambda t: [t])
        assert achados == [livros[esperado]] and aproximado, digitado
    # ordem diferente é busca exata, não aproximada
    assert busca.filtrar(livros, "casmurro dom", lambda t: [t]) == ([livros[0]], False)
    # transposição de letras
    assert busca.filtrar(livros, "casmrurro", lambda t: [t])[0] == [livros[0]]


def test_aproximada_nao_polui_quando_existe_resultado_exato():
    nomes = ["Maria Silva", "Mario Silva"]
    achados, aproximado = busca.filtrar(nomes, "maria", lambda t: [t])
    assert achados == ["Maria Silva"] and not aproximado


def test_numeros_palavras_curtas_e_termos_distantes_nao_viram_aproximados():
    assert busca.filtrar(["RA 12345"], "12346", lambda t: [t]) == ([], False)
    assert busca.filtrar(["Ana Lima"], "anu", lambda t: [t]) == ([], False)
    assert busca.filtrar(["Dom Casmurro"], "xadrez", lambda t: [t]) == ([], False)


def test_termo_vazio_devolve_tudo_sem_marcar_aproximado():
    assert busca.filtrar(["a", "b"], "  ", lambda t: [t]) == (["a", "b"], False)
    assert busca.corresponde("qualquer", "") is True


def test_distancia_respeita_o_limite():
    assert busca._distancia("casmurro", "casmuro", 1) == 1
    assert busca._distancia("abcd", "badc", 2) == 2
    assert busca._distancia("abcdef", "uvwxyz", 1) == 2


@pytest.mark.parametrize("entrada,saida", CASOS["normalizar"])
def test_normalizacao_igual_ao_frontend_e_ao_sql(entrada, saida):
    assert busca.normalizar(entrada) == saida


@pytest.mark.parametrize("texto,termo,esperado", CASOS["exata"])
def test_casos_compartilhados_busca_exata(texto, termo, esperado):
    assert busca.corresponde(texto, termo) is esperado


@pytest.mark.parametrize("texto,termo,esperado", CASOS["aproximada"])
def test_casos_compartilhados_busca_aproximada(texto, termo, esperado):
    assert busca.corresponde(texto, termo, aproximado=True) is esperado
