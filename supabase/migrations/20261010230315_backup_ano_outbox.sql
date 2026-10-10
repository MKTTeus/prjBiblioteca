-- Snapshot e restauração consistentes. A trava é compartilhada com as demais escritas.
CREATE OR REPLACE FUNCTION public.tabelas_backup() RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT ARRAY['Administrador','Usuario','Autor','Editora','Categoria','Genero','Livro','Exemplar',
 'LivroAutor','LivroCategoria','LivroGenero','Movimentacao','MovimentacaoExemplar','Configuracoes',
 'FichaCatalografica','ResultadoAnoLetivo','TomboContador','EmailOutbox','RedefinicaoSenha']::text[] $$;
CREATE OR REPLACE FUNCTION public.gerar_snapshot_backup() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text; dados jsonb:='{}'; linhas jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(814701);
 FOREACH t IN ARRAY tabelas_backup() LOOP EXECUTE format('LOCK TABLE public.%I IN SHARE MODE',t); END LOOP;
 FOREACH t IN ARRAY tabelas_backup() LOOP
   EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) FROM public.%I r',t) INTO linhas;
   dados:=dados||jsonb_build_object(t,linhas);
 END LOOP;
 RETURN dados;
END $$;
CREATE OR REPLACE FUNCTION public.restaurar_backup_completo(dados jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text; tabelas text[]:=tabelas_backup(); linha jsonb; colunas text; esperadas text[]; seq text; pk text; maior bigint; resultado jsonb:='{}';
BEGIN
 PERFORM pg_advisory_xact_lock(814701);
 FOREACH t IN ARRAY tabelas LOOP
   IF dados->t IS NULL OR jsonb_typeof(dados->t)<>'array' THEN RAISE EXCEPTION 'Backup incompleto: %',t; END IF;
   EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE',t);
 END LOOP;
 -- Apenas esta transação evita os gatilhos de normalização/versionamento de contas.
 PERFORM set_config('biblioteca.restaurando','on',true);
 FOR i IN REVERSE array_length(tabelas,1)..1 LOOP EXECUTE format('DELETE FROM public.%I',tabelas[i]); END LOOP;
 FOREACH t IN ARRAY tabelas LOOP
   SELECT string_agg(format('%I',attname),',' ORDER BY attnum), array_agg(attname::text ORDER BY attname)
   INTO colunas,esperadas FROM pg_attribute WHERE attrelid=format('public.%I',t)::regclass AND attnum>0 AND NOT attisdropped AND attgenerated='';
   FOR linha IN SELECT value FROM jsonb_array_elements(dados->t) LOOP
     IF jsonb_typeof(linha)<>'object' OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(linha) k) IS DISTINCT FROM esperadas THEN
       RAISE EXCEPTION 'Colunas incompatíveis no backup de %; restauração revertida',t;
     END IF;
     EXECUTE format('INSERT INTO public.%I (%s) OVERRIDING SYSTEM VALUE SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1)',t,colunas,colunas,t) USING linha;
   END LOOP;
   resultado:=resultado||jsonb_build_object(t,jsonb_array_length(dados->t));
   FOR pk,seq IN SELECT attname,pg_get_serial_sequence(format('public.%I',t),attname) FROM pg_attribute
       WHERE attrelid=format('public.%I',t)::regclass AND attnum>0 AND NOT attisdropped LOOP
     IF seq IS NOT NULL THEN
       EXECUTE format('SELECT max(%I) FROM public.%I',pk,t) INTO maior;
       PERFORM setval(seq::regclass,coalesce(maior,1),maior IS NOT NULL);
     END IF;
   END LOOP;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM "Administrador" WHERE "admStatus" AND NOT "admProfessor") THEN RAISE EXCEPTION 'Backup não possui gestor ativo'; END IF;
 IF EXISTS(SELECT 1 FROM "Administrador" a JOIN "Usuario" u ON lower(btrim(a."admEmail"))=lower(btrim(u."usuEmail"))) THEN RAISE EXCEPTION 'Emails ambíguos no backup'; END IF;
 IF EXISTS(SELECT 1 FROM "MovimentacaoExemplar" me JOIN "Exemplar" e USING("idExemplar") WHERE
   (me."itemStatus" IN('Pendente','Aprovado') AND e."exeLivStatus" IS DISTINCT FROM 'Reservado') OR
   (me."itemStatus"='Ativo' AND e."exeLivStatus" IS DISTINCT FROM 'Emprestado')) THEN RAISE EXCEPTION 'Circulação inconsistente no backup'; END IF;
 UPDATE "RedefinicaoSenha" SET "usadoEm"=now() WHERE "usadoEm" IS NULL;
 UPDATE "EmailOutbox" SET lease_ate=NULL,lease_token=NULL;
 DELETE FROM "RequisicaoIdempotente";
 UPDATE "SegurancaSessao" SET epoch=gen_random_uuid() WHERE id=1;
 PERFORM set_config('biblioteca.restaurando','off',true);
 RETURN resultado;
END $$;
CREATE OR REPLACE FUNCTION public.encerrar_ano_letivo(p_ano integer,p_retidos integer[] DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE atual integer; promovidos integer; formados integer; retidos integer; series text[]:=ARRAY['6º Ano','7º Ano','8º Ano','9º Ano','1º Ano EM','2º Ano EM','3º Ano EM'];
BEGIN
 PERFORM pg_advisory_xact_lock(814701);
 atual:=config_int('ano_letivo_atual',extract(year FROM current_date)::integer);
 IF atual<>p_ano THEN RAISE EXCEPTION 'Ano já encerrado ou alterado. Atualize a página'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_retidos) id WHERE NOT EXISTS(SELECT 1 FROM "Usuario" u WHERE u."idUsuario"=id AND u."usuTipo"='Aluno' AND u."usuStatus" AND NOT u."usuExcluido" AND NOT u."usuFormado")) THEN RAISE EXCEPTION 'Aluno retido inválido'; END IF;
 IF EXISTS(SELECT 1 FROM "Usuario" WHERE "usuTipo"='Aluno' AND "usuStatus" AND NOT "usuExcluido" AND NOT "usuFormado" AND ("usuSerie" IS NULL OR NOT "usuSerie"=ANY(series))) THEN RAISE EXCEPTION 'Corrija a série dos alunos antes de encerrar'; END IF;
 INSERT INTO "ResultadoAnoLetivo" ("idUsuario",ano,serie,turma,resultado)
 SELECT "idUsuario",atual,"usuSerie","usuTurma",CASE WHEN "idUsuario"=ANY(p_retidos) THEN 'Retido' WHEN "usuSerie"='3º Ano EM' THEN 'Formado' ELSE 'Promovido' END
 FROM "Usuario" WHERE "usuTipo"='Aluno' AND "usuStatus" AND NOT "usuExcluido" AND NOT "usuFormado";
 SELECT count(*) FILTER(WHERE resultado='Promovido'),count(*) FILTER(WHERE resultado='Formado'),count(*) FILTER(WHERE resultado='Retido') INTO promovidos,formados,retidos FROM "ResultadoAnoLetivo" WHERE ano=atual;
 UPDATE "Usuario" u SET "usuSerie"=CASE WHEN r.resultado='Promovido' THEN series[array_position(series,r.serie)+1] ELSE r.serie END,
 "usuFormado"=r.resultado='Formado',"usuAnoLetivo"=atual+1 FROM "ResultadoAnoLetivo" r WHERE r."idUsuario"=u."idUsuario" AND r.ano=atual;
 INSERT INTO "Configuracoes"(chave,valor) VALUES('ano_letivo_atual',(atual+1)::text) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor,atualizado_em=now();
 RETURN jsonb_build_object('promovidos',promovidos,'formados',formados,'retidos',retidos,'novoAnoLetivo',atual+1);
END $$;
CREATE OR REPLACE FUNCTION public.reservar_emails(p_limite integer DEFAULT 20) RETURNS SETOF "EmailOutbox" LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 RETURN QUERY WITH candidatos AS (SELECT id FROM "EmailOutbox" WHERE enviado_em IS NULL AND proxima_tentativa<=now() AND (lease_ate IS NULL OR lease_ate<now()) ORDER BY id LIMIT least(greatest(p_limite,1),20) FOR UPDATE SKIP LOCKED)
 UPDATE "EmailOutbox" e SET lease_token=gen_random_uuid(),lease_ate=now()+interval '5 minutes',tentativas=tentativas+1 FROM candidatos c WHERE e.id=c.id RETURNING e.*;
END $$;
CREATE OR REPLACE FUNCTION public.concluir_email(p_id bigint,p_lease uuid,p_sucesso boolean) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE "EmailOutbox" SET enviado_em=CASE WHEN p_sucesso THEN now() ELSE NULL END,
 proxima_tentativa=now()+make_interval(mins=>least(1440,5*(2^least(tentativas,8))::integer)),lease_ate=NULL,lease_token=NULL WHERE id=p_id AND lease_token=p_lease;
 RETURN FOUND;
END $$;
DO $$ DECLARE f regprocedure; BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('tabelas_backup','gerar_snapshot_backup','restaurar_backup_completo','encerrar_ano_letivo','reservar_emails','concluir_email') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.enfileirar_lembretes() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
 PERFORM pg_advisory_xact_lock(814701);
 INSERT INTO "EmailOutbox"(chave,"idMovimentacao",tipo)
 SELECT (CASE WHEN me."dataPrevistaDevolucao"<(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN 'atraso' ELSE 'devolucao' END)||':'||m."idMovimentacao"||':'||me."idExemplar"||':'||me."dataPrevistaDevolucao",m."idMovimentacao",
 CASE WHEN me."dataPrevistaDevolucao"<(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN 'atraso' ELSE 'devolucao' END
 FROM "Movimentacao" m JOIN "MovimentacaoExemplar" me USING("idMovimentacao") WHERE m."movTipo"='EMPRESTIMO' AND me."itemStatus"='Ativo'
 AND me."dataPrevistaDevolucao" <= (now() AT TIME ZONE 'America/Sao_Paulo')::date + greatest(0,least(30,config_int('dias_antecedencia_lembrete',2))) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.enfileirar_lembretes() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enfileirar_lembretes() TO service_role;
