"""Diagnóstico somente leitura antes de aplicar as migrations da auditoria."""
import os
import sys
import psycopg
from dotenv import load_dotenv
load_dotenv()
url=os.getenv('DATABASE_URL')
if not url:sys.exit('Defina DATABASE_URL para o banco que deseja verificar (nenhuma escrita é feita).')
checks=[
 ('Emails duplicados em usuários','SELECT count(*) FROM (SELECT lower(btrim("usuEmail")) FROM "Usuario" GROUP BY 1 HAVING count(*)>1) x'),
 ('Emails duplicados em administradores','SELECT count(*) FROM (SELECT lower(btrim("admEmail")) FROM "Administrador" GROUP BY 1 HAVING count(*)>1) x'),
 ('Emails presentes nas duas tabelas','SELECT count(*) FROM "Usuario" u JOIN "Administrador" a ON lower(btrim(u."usuEmail"))=lower(btrim(a."admEmail"))'),
 ('Exemplares com mais de uma circulação vigente','SELECT count(*) FROM (SELECT "idExemplar" FROM "MovimentacaoExemplar" WHERE "itemStatus" IN(\'Pendente\',\'Aprovado\',\'Ativo\') GROUP BY 1 HAVING count(*)>1) x'),
 ('Status físico incompatível com circulação','SELECT count(*) FROM "MovimentacaoExemplar" me JOIN "Exemplar" e USING("idExemplar") WHERE (me."itemStatus" IN(\'Pendente\',\'Aprovado\') AND e."exeLivStatus" IS DISTINCT FROM \'Reservado\') OR (me."itemStatus"=\'Ativo\' AND e."exeLivStatus" IS DISTINCT FROM \'Emprestado\')'),
 ('Livros com páginas inválidas','SELECT count(*) FROM "Livro" WHERE "livPaginas"<=0'),
 ('Tombos vazios','SELECT count(*) FROM "Exemplar" WHERE btrim("exeLivTombo")=\'\''),
]
try:
 with psycopg.connect(url) as conn:
  conn.execute('SET TRANSACTION READ ONLY')
  for tabela,pk in [('Usuario','idUsuario'),('Administrador','idAdmin'),('Livro','idLivro'),('Exemplar','idExemplar'),('MovimentacaoExemplar','idMovimentacao')]:
   columns=conn.execute('SELECT column_name FROM information_schema.columns WHERE table_schema=\'public\' AND table_name=%s',(tabela,)).fetchall()
   if not columns:sys.exit(f'Tabela {tabela} ausente. Banco novo: use o baseline. Banco existente: confira capitalização e nomes antes de continuar.')
   if pk not in {c[0] for c in columns}:sys.exit(f'Schema incompatível em {tabela}: falta {pk} com capitalização correta.')
  falhas=0
  for rotulo,sql in checks:
   n=conn.execute(sql).fetchone()[0];print(f'{rotulo}: {n}');falhas+=n
  if falhas:sys.exit('Corrija os registros apontados em uma cópia do banco antes de aplicar as migrations. Não há correção automática destrutiva.')
  print('Pré-verificação concluída sem os conflitos conhecidos. Ainda é necessário ensaiar em homologação.')
except psycopg.Error as exc:
 sys.exit(f'Pré-verificação interrompida: {type(exc).__name__} (SQLSTATE {exc.sqlstate}). Confira acesso e schema.')
