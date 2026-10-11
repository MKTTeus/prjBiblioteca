import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from diagnostics import resumir_excecao


def test_diagnostics_only_include_valid_database_codes_and_bound_chains():
    error = RuntimeError('sensitive message')
    error.code = 'PGRST301'
    error.__cause__ = error
    assert resumir_excecao(error) == [
        {'tipo': 'RuntimeError', 'frames': [], 'codigo': 'PGRST301'},
    ]
    error.code = '42501'
    assert resumir_excecao(error)[0]['codigo'] == '42501'
    error.code = 'https://private.example.com/?token=secret'
    assert 'codigo' not in resumir_excecao(error)[0]
