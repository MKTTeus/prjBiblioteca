"""
Configuração compartilhada dos testes.

IMPORTANTE: as variáveis de ambiente abaixo são definidas no import deste
módulo (antes da coleta dos testes), porque `database.py` e `core.py`
criam o client do Supabase / validam o SECRET_KEY assim que são importados.
Sem isso, qualquer `from routers.x import y` explodiria tentando ler
configurações reais do .env.

Os testes aqui são unitários: nenhuma chamada de rede é feita de verdade.
Cada teste que toca uma função que usa `supabase` faz o mock do client
(veja tests/test_enriquecer_livros.py para um exemplo).
"""
import os

os.environ.setdefault("SUPABASE_URL", "https://exemplo-teste.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "chave-fake-de-teste")
os.environ.setdefault("SECRET_KEY", "chave-secreta-fake-para-testes")