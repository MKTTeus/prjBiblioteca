import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

process.on('uncaughtException', e => { console.error(e.message,e.where || '',e.internalQuery || ''); process.exit(1); });
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE TABLE "RedefinicaoSenha"("idRedefinicao" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"usuEmail" text NOT NULL,"tokenHash" text NOT NULL UNIQUE,"expiraEm" timestamp NOT NULL,"usadoEm" timestamp,"criadoEm" timestamp DEFAULT now());
 CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint);
 CREATE TABLE storage.objects(id integer GENERATED ALWAYS AS IDENTITY,bucket_id text);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE POLICY old_permissive ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
 GRANT USAGE ON SCHEMA storage TO anon,authenticated; GRANT ALL ON storage.objects TO anon,authenticated;
 GRANT USAGE ON ALL SEQUENCES IN SCHEMA storage TO anon,authenticated;`);
for (const name of readdirSync('supabase/migrations').filter(n => n.endsWith('.sql')).sort()) {
  try { await db.exec(readFileSync(`supabase/migrations/${name}`, 'utf8')); }
  catch (error) { console.error(`Migration ${name}: ${error.message}`); console.error({position:error.position, internalPosition:error.internalPosition, internalQuery:error.internalQuery, where:error.where}); process.exit(1); }
}
const query = async (sql, args = []) => (await db.query(sql, args)).rows;
const scalar = async (sql, args = []) => Object.values((await query(sql, args))[0])[0];
const rejected = async (sql, args=[]) => { await assert.rejects(() => db.query(sql,args)); };
await db.exec(`INSERT INTO "Administrador" ("admNome","admEmail","admSenha") VALUES ('Gestor','gestor@example.com','hash');
INSERT INTO "Administrador" ("admNome","admEmail","admSenha","admProfessor") VALUES ('Professor','prof@example.com','hash',true);
INSERT INTO "Usuario" ("usuNome","usuEmail","usuSenha","usuTipo","usuSerie","usuTurma") VALUES ('Aluno','aluno@example.com','hash','Aluno','6º Ano','A');
INSERT INTO "Livro" ("livTitulo","livPaginas") VALUES ('Livro A',100),('Livro B',100);
INSERT INTO "Exemplar" ("idLivro","exeLivTombo") VALUES (1,'T0001'),(1,'T0002'),(2,'T0003');`);
const create = (usuario, professor, admin, itens, extra='') => scalar(`SELECT criar_movimentacao($1,$2,$3,$4::jsonb${professor ? ",p_finalidade=>'PESSOAL'" : ''}${extra})`,[usuario,professor,admin,JSON.stringify(itens)]);
const move = (id,acao, extra='') => scalar(`SELECT transicionar_movimentacao($1,$2,1${extra})`,[id,acao]);
const req = await create(null,2,null,[{idLivro:1,quantidade:2},{idLivro:2,quantidade:1}]);
await move(req.idMovimentacao,'aprovar'); await move(req.idMovimentacao,'retirar');
assert.equal(await scalar(`SELECT count(*) FROM "Exemplar" WHERE "exeLivStatus"='Emprestado'`),3);
await scalar(`SELECT transicionar_movimentacao($1,'devolver',p_professor=>2,p_ids=>ARRAY[1])`,[req.idMovimentacao]);
assert.equal(await scalar(`SELECT "movStatus" FROM "Movimentacao" WHERE "idMovimentacao"=$1`,[req.idMovimentacao]),'Ativo');
const novo = await create(1,null,1,[], ',p_exemplar=>1,p_direto=>true');
await scalar(`SELECT transicionar_movimentacao($1,'devolver',p_professor=>2,p_ids=>ARRAY[1])`,[req.idMovimentacao]);
assert.equal(await scalar(`SELECT "exeLivStatus" FROM "Exemplar" WHERE "idExemplar"=1`),'Emprestado');
await rejected(`SELECT transicionar_movimentacao($1,'expirar',1)`,[novo.idMovimentacao]);
await rejected(`SELECT criar_movimentacao(1,NULL,1,'[]'::jsonb,p_exemplar=>1,p_direto=>true)`);
await scalar(`SELECT transicionar_movimentacao($1,'devolver',p_professor=>2,p_ids=>ARRAY[2,3])`,[req.idMovimentacao]);
const negado = await create(null,2,null,[{idLivro:1,quantidade:1},{idLivro:2,quantidade:1}]);
await move(negado.idMovimentacao,'rejeitar');
assert.equal(await scalar(`SELECT count(*) FROM "Exemplar" WHERE "exeLivStatus"='Reservado'`),0);
// Uma falta no segundo título deve reverter tudo, inclusive a primeira reserva.
await rejected(`SELECT criar_movimentacao(NULL,2,NULL,'[{"idLivro":1,"quantidade":1},{"idLivro":2,"quantidade":99}]',p_finalidade=>'PESSOAL')`);
assert.equal(await scalar(`SELECT count(*) FROM "Exemplar" WHERE "exeLivStatus"='Reservado'`),0);
await scalar(`SELECT transicionar_movimentacao($1,'devolver',1,p_ids=>ARRAY[1])`,[novo.idMovimentacao]);
const key='11111111-1111-4111-8111-111111111111';
const first=await create(1,null,null,[{idLivro:1,quantidade:1}],`,p_chave=>'${key}'`);
const retry=await create(1,null,null,[{idLivro:1,quantidade:1}],`,p_chave=>'${key}'`);
assert.equal(first.idMovimentacao,retry.idMovimentacao);
await rejected(`SELECT criar_movimentacao(1,NULL,NULL,'[{"idLivro":2,"quantidade":1}]',p_chave=>$1)`,[key]);
await rejected(`SELECT transicionar_movimentacao($1,'renovar',1,p_nova_data=>current_date+30)`,[first.idMovimentacao]);
assert.equal(await scalar(`SELECT has_function_privilege('anon','public.criar_movimentacao(integer,integer,integer,jsonb,integer,boolean,text,text,text,uuid)','EXECUTE')`),false);
assert.equal(await scalar(`SELECT has_function_privilege('authenticated','public.consumir_reset(text,text)','EXECUTE')`),false);
await rejected(`UPDATE "Administrador" SET "admProfessor"=true WHERE "idAdmin"=1`);
await rejected(`INSERT INTO "Usuario" ("usuNome","usuEmail","usuSenha","usuTipo") VALUES ('X','gestor@example.com','hash','Aluno')`);
await db.exec(`UPDATE "Usuario" SET "usuSenha"='novo-hash' WHERE "idUsuario"=1`);
assert.equal(await scalar(`SELECT "usuTokenVersion" FROM "Usuario" WHERE "idUsuario"=1`),2);
// Migração do timestamp legado e consumo único, mesmo fora da timezone UTC.
assert.equal(await scalar(`SELECT data_type FROM information_schema.columns WHERE table_name='RedefinicaoSenha' AND column_name='expiraEm'`),'timestamp with time zone');
await db.exec(`SET TIME ZONE 'America/Sao_Paulo';
INSERT INTO "RedefinicaoSenha"("usuEmail","tokenHash","expiraEm","contaTipo","contaId") VALUES('aluno@example.com','past',now()-interval '1 minute','usuario',1),('aluno@example.com','valid',now()+interval '10 minutes','usuario',1);`);
await rejected(`SELECT consumir_reset('past','hash')`);
await scalar(`SELECT consumir_reset('valid','hash-reset')`);
await rejected(`SELECT consumir_reset('valid','hash')`);
await db.exec(`SET TIME ZONE 'UTC'`);
// Catálogo atômico: FK inválida reverte o livro e qualquer autor/editora criado.
const before=await scalar('SELECT count(*) FROM "Livro"');
await rejected(`SELECT salvar_livro(NULL,'{"livTitulo":"Falha","livPaginas":100,"livAutor":"Novo autor","livEditora":"Nova editora","idCategoria":999}',1,'T')`);
assert.equal(await scalar('SELECT count(*) FROM "Livro"'),before);
assert.equal(await scalar(`SELECT count(*) FROM "Autor" WHERE "autNome"='Novo autor'`),0);
await db.exec(`INSERT INTO "Exemplar"("idLivro","exeLivTombo") VALUES(2,'T9999'),(2,'T10000')`);
const created=await scalar(`SELECT salvar_livro(NULL,'{"livTitulo":"Teste","livPaginas":50,"livAutor":"Autor teste"}',2,'T')`);
assert.deepEqual(created.exemplares.map(x=>x.exeLivTombo),['T10001','T10002']);
await scalar(`SELECT salvar_livro($1,'{"livAutor":"","livISBN":"123"}')`,[created.livro.idLivro]);
assert.equal(await scalar(`SELECT count(*) FROM "LivroAutor" WHERE "idLivro"=$1`,[created.livro.idLivro]),0);
await db.exec(`INSERT INTO "FichaCatalografica"("idLivro","ficTexto") VALUES(${created.livro.idLivro},'ficha')`);
await scalar('SELECT excluir_livro($1)',[created.livro.idLivro]);
await rejected(`SELECT transicionar_movimentacao($1,'devolver',p_professor=>2,p_ids=>ARRAY[1])`,[novo.idMovimentacao]);
// Expiração só atua após o prazo e libera todas as cópias.
const expiry=await create(null,2,null,[{idLivro:2,quantidade:2}]);
await move(expiry.idMovimentacao,'aprovar');
await rejected(`SELECT transicionar_movimentacao($1,'expirar',1)`,[expiry.idMovimentacao]);
await db.query(`UPDATE "Movimentacao" SET data_confirmacao=now()-interval '49 hours' WHERE "idMovimentacao"=$1`,[expiry.idMovimentacao]);
await scalar('SELECT processar_prazos()');
assert.equal(await scalar(`SELECT count(*) FROM "MovimentacaoExemplar" WHERE "idMovimentacao"=$1 AND "itemStatus"='Expirado'`,[expiry.idMovimentacao]),2);
assert.equal(await scalar(`SELECT count(*) FROM "Exemplar" WHERE "idLivro"=2 AND "exeLivStatus"='Reservado'`),0);
// Livros inativos não podem entrar por caminhos alternativos.
await db.exec('UPDATE "Livro" SET "livAtivo"=false WHERE "idLivro"=2');
await rejected(`SELECT criar_movimentacao(1,NULL,1,'[]',p_exemplar=>3,p_direto=>true)`);
await rejected(`SELECT criar_movimentacao(NULL,2,NULL,'[{"idLivro":2,"quantidade":1}]',p_finalidade=>'PESSOAL')`);
await db.exec('UPDATE "Livro" SET "livAtivo"=true WHERE "idLivro"=2');
// Renovação de uma cópia preserva o prazo e o contador das outras.
const renewal=await create(null,2,null,[{idLivro:2,quantidade:2}]);await move(renewal.idMovimentacao,'aprovar');await move(renewal.idMovimentacao,'retirar');
const renewalIds=(await query('SELECT "idExemplar" FROM "MovimentacaoExemplar" WHERE "idMovimentacao"=$1 ORDER BY "idExemplar"',[renewal.idMovimentacao])).map(i=>i.idExemplar);
await scalar(`SELECT transicionar_movimentacao($1,'renovar',1,p_ids=>$2::int[],p_nova_data=>current_date+60)`,[renewal.idMovimentacao,renewalIds.slice(0,1)]);
assert.equal(await scalar('SELECT sum(renovacoes) FROM "MovimentacaoExemplar" WHERE "idMovimentacao"=$1',[renewal.idMovimentacao]),1);
// Permissões Storage continuam negando segredos/escrita mesmo com policy antiga permissiva.
assert.equal(await scalar(`SELECT public FROM storage.buckets WHERE id='backups'`),false);
await db.exec(`INSERT INTO storage.objects(bucket_id) VALUES('backups'),('capas'); SET ROLE anon;`);
assert.equal(await scalar('SELECT count(*) FROM storage.objects'),1);
await rejected(`INSERT INTO storage.objects(bucket_id) VALUES('capas')`);
await db.exec('RESET ROLE;');
// Snapshot mantém TODOS os campos, seqüências e invalida credenciais de sessão.
const snapshot=await scalar('SELECT gerar_snapshot_backup()');
const epoch=await scalar('SELECT epoch FROM "SegurancaSessao"');
await db.exec(`UPDATE "Usuario" SET "usuNome"='Alterado' WHERE "idUsuario"=1`);
await scalar('SELECT restaurar_backup_completo($1::jsonb)',[JSON.stringify(snapshot)]);
assert.equal(await scalar('SELECT "usuNome" FROM "Usuario" WHERE "idUsuario"=1'),'Aluno');
assert.notEqual(await scalar('SELECT epoch FROM "SegurancaSessao"'),epoch);
const bad=structuredClone(snapshot);delete bad.Usuario[0].usuNome;
await rejected('SELECT restaurar_backup_completo($1::jsonb)',[JSON.stringify(bad)]);
assert.equal(await scalar('SELECT "usuNome" FROM "Usuario" WHERE "idUsuario"=1'),'Aluno');
// Fechamento guarda a série histórica e só retém os alunos selecionados.
await db.exec(`INSERT INTO "Usuario"("usuNome","usuEmail","usuSenha","usuTipo","usuSerie") VALUES('Finalista','final@example.com','hash','Aluno','3º Ano EM')`);
const closure=await scalar('SELECT encerrar_ano_letivo(2026,ARRAY[1])');
assert.equal(closure.retidos,1);assert.equal(closure.formados,1);
assert.equal(await scalar('SELECT "usuSerie" FROM "Usuario" WHERE "idUsuario"=1'),'6º Ano');
assert.equal(await scalar('SELECT serie FROM "ResultadoAnoLetivo" WHERE "idUsuario"=1 AND ano=2026'),'6º Ano');
await rejected('SELECT encerrar_ano_letivo(2026)');
// Leases não entregam o mesmo evento a dois workers.
const batch=await query('SELECT * FROM reservar_emails(20)');
const batch2=await query('SELECT * FROM reservar_emails(20)');
assert.equal(batch2.length,0);
if(batch.length){
 assert.equal(await scalar('SELECT concluir_email($1,$2,false)',[batch[0].id,batch[0].lease_token]),true);
 assert.equal(await scalar('SELECT concluir_email($1,$2,true)',[batch[0].id,'11111111-1111-4111-8111-111111111111']),false);
}
console.log('Banco: migrations, permissões, múltiplas cópias, rollback, idempotência, estados e sessões OK.');
await db.close();
