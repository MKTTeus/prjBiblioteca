"""Busca tolerante a acentos, caixa, pontuação e pequenos erros de digitação.

A regra de normalização é a mesma da função SQL ``public.busca_normalizar`` e do
utilitário ``src/utils/busca.js``: qualquer ajuste aqui deve ser espelhado lá.

Como a busca decide:
1. Exata: todas as palavras digitadas (em qualquer ordem) precisam aparecer no texto,
   ignorando acentos, maiúsculas e pontuação.
2. Aproximada: só quando a busca exata não encontra nada, aceita palavras com até
   um ou dois caracteres trocados, faltando ou invertidos. Números e códigos (RA, CPF,
   tombo) nunca usam a busca aproximada, e palavras curtas também não.
"""

import re
import unicodedata
from typing import Callable, Iterable, TypeVar

T = TypeVar("T")


def normalizar(valor: object) -> str:
    """Minúsculas, sem acentos nem pontuação, com espaços simplificados."""
    texto = unicodedata.normalize("NFD", str(valor if valor is not None else ""))
    texto = "".join(c for c in texto if not unicodedata.category(c).startswith("M")).casefold()
    texto = "".join(c for c in texto if c.isalnum() or c.isspace())
    return re.sub(r"\s+", " ", texto).strip()


def tokens(termo: object) -> list[str]:
    return [t for t in normalizar(termo).split(" ") if t]


def _limite_erros(tamanho: int) -> int:
    return 0 if tamanho < 4 else 1 if tamanho <= 8 else 2


def _distancia(a: str, b: str, limite: int) -> int:
    """Distância de Damerau-Levenshtein (com transposição) limitada: devolve
    ``limite + 1`` assim que ultrapassa o máximo aceito."""
    if abs(len(a) - len(b)) > limite:
        return limite + 1
    anterior2: list[int] | None = None
    anterior = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        atual = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            custo = 0 if ca == cb else 1
            atual[j] = min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo)
            if anterior2 is not None and i > 1 and j > 1 and ca == b[j - 2] and a[i - 2] == cb:
                atual[j] = min(atual[j], anterior2[j - 2] + 1)
        if min(atual) > limite:
            return limite + 1
        anterior2, anterior = anterior, atual
    return anterior[-1]


def _palavra_semelhante(token: str, palavra: str) -> bool:
    limite = _limite_erros(len(token))
    if not limite or not token.isalpha():
        return False
    # Compara com a palavra inteira e com o começo dela, para quem ainda está digitando.
    return (_distancia(token, palavra, limite) <= limite
            or _distancia(token, palavra[:len(token)], limite) <= limite)


def _corresponde_exato(texto_norm: str, partes: list[str]) -> bool:
    return all(p in texto_norm for p in partes)


def _corresponde_aproximado(texto_norm: str, partes: list[str]) -> bool:
    palavras = texto_norm.split(" ")
    return all(p in texto_norm or any(_palavra_semelhante(p, w) for w in palavras) for p in partes)


def corresponde(texto: object, termo: object, aproximado: bool = False) -> bool:
    partes = tokens(termo)
    if not partes:
        return True
    texto_norm = normalizar(texto)
    return _corresponde_aproximado(texto_norm, partes) if aproximado else _corresponde_exato(texto_norm, partes)


def filtrar(itens: Iterable[T], termo: object, textos: Callable[[T], Iterable[object]],
            permitir_aproximado: bool = True) -> tuple[list[T], bool]:
    """Filtra ``itens`` pelo ``termo``. Devolve ``(resultado, aproximado)``, sendo
    ``aproximado`` verdadeiro quando só a busca tolerante a erros encontrou algo.
    Com ``permitir_aproximado=False`` só a busca exata é feita."""
    itens = list(itens)
    partes = tokens(termo)
    if not partes:
        return itens, False
    preparados = [(item, normalizar(" ".join(str(t) for t in textos(item) if t is not None))) for item in itens]
    exatos = [item for item, texto in preparados if _corresponde_exato(texto, partes)]
    if exatos or not permitir_aproximado:
        return exatos, False
    aproximados = [item for item, texto in preparados if _corresponde_aproximado(texto, partes)]
    return aproximados, bool(aproximados)
