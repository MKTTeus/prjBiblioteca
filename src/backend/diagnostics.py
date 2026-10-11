"""Metadados de exceções sem mensagens, URLs, argumentos ou variáveis locais."""

from pathlib import Path
import re


def resumir_excecao(exc: BaseException) -> list[dict]:
    causas = []
    vistos = set()
    while exc is not None and id(exc) not in vistos and len(causas) < 5:
        vistos.add(id(exc))
        frames = []
        tb = exc.__traceback__
        while tb is not None:
            codigo = tb.tb_frame.f_code
            frames.append({
                "arquivo": Path(codigo.co_filename).name,
                "funcao": codigo.co_name,
                "linha": tb.tb_lineno,
            })
            tb = tb.tb_next
        causa = {"tipo": type(exc).__name__, "frames": frames[-12:]}
        # Somente códigos SQLSTATE/PostgREST; nunca details/message/hint.
        codigo = getattr(exc, "code", None)
        if isinstance(codigo, str) and re.fullmatch(r"(?:[0-9A-Z]{5}|PGRST[0-9]{3})", codigo):
            causa["codigo"] = codigo
        causas.append(causa)
        exc = exc.__cause__ or (None if exc.__suppress_context__ else exc.__context__)
    return causas
