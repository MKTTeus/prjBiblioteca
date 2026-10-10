"""Aceitação em PostgreSQL real e vazio, usado apenas no banco descartável da CI."""
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
import psycopg
url=os.environ['TEST_DATABASE_URL']
if not urlparse(url).path.endswith('/biblioteca_test'):raise RuntimeError('Use o banco descartável biblioteca_test')
with psycopg.connect(url,autocommit=True) as c:
 if c.execute("SELECT to_regclass('public.\"Livro\"')").fetchone()[0]:raise RuntimeError('Banco de teste deve estar vazio')
 c.execute('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;')
 for f in sorted(Path('supabase/migrations').glob('*.sql')):c.execute(f.read_text())
 c.execute('INSERT INTO "Administrador"("admNome","admEmail","admSenha") VALUES(\'Gestor\',\'gestor@test.example\',\'hash\')')
 c.execute('INSERT INTO "Usuario"("usuNome","usuEmail","usuSenha","usuTipo") VALUES(\'Aluno\',\'aluno@test.example\',\'hash\',\'Aluno\')')
 c.execute('INSERT INTO "Livro"("livTitulo","livPaginas") VALUES(\'Livro\',100)')
 c.execute('INSERT INTO "Exemplar"("idLivro","exeLivTombo") VALUES(1,\'T0001\')')
def pedir():
 try:
  with psycopg.connect(url) as c:
   return c.execute("SELECT criar_movimentacao(1,NULL,1,'[]'::jsonb,p_exemplar=>1,p_direto=>true)").fetchone()[0]
 except psycopg.Error as exc:
  assert exc.sqlstate in ('P0001','23505');return None
with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:pedir(),range(2)))
assert sum(r is not None for r in results)==1
with psycopg.connect(url) as c:
 assert c.execute('SELECT count(*) FROM "Movimentacao"').fetchone()[0]==1
 assert c.execute('SELECT "exeLivStatus" FROM "Exemplar" WHERE "idExemplar"=1').fetchone()[0]=='Emprestado'
print('PostgreSQL real: migrations e disputa simultânea da mesma cópia OK.')
