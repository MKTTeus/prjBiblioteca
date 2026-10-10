CREATE OR REPLACE FUNCTION public.adicionar_exemplares(p_livro integer,p_quantidade integer,p_prefixo text DEFAULT 'T') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ultimo bigint; exemplares jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(814701);
 IF p_quantidade NOT BETWEEN 1 AND 500 OR p_prefixo !~ '^[A-Za-z][A-Za-z0-9_-]{0,19}$' THEN RAISE EXCEPTION 'Quantidade ou prefixo inválido'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "Livro" WHERE "idLivro"=p_livro) THEN RAISE EXCEPTION 'Livro não encontrado'; END IF;
 SELECT coalesce(max(substring("exeLivTombo" FROM length(p_prefixo)+1)::bigint),0) INTO ultimo FROM "Exemplar"
 WHERE left("exeLivTombo",length(p_prefixo))=p_prefixo AND substring("exeLivTombo" FROM length(p_prefixo)+1) ~ '^[0-9]{1,15}$';
 INSERT INTO "TomboContador" VALUES(p_prefixo,ultimo) ON CONFLICT(prefixo) DO UPDATE SET ultimo=greatest("TomboContador".ultimo,excluded.ultimo);
 UPDATE "TomboContador" SET ultimo="TomboContador".ultimo+p_quantidade WHERE prefixo=p_prefixo RETURNING "TomboContador".ultimo-p_quantidade INTO ultimo;
 WITH novos AS (INSERT INTO "Exemplar"("idLivro","exeLivTombo","exeLivStatus")
 SELECT p_livro,p_prefixo||lpad((ultimo+n)::text,greatest(4,length((ultimo+n)::text)),'0'),'Disponível' FROM generate_series(1,p_quantidade) n RETURNING *)
 SELECT jsonb_agg(to_jsonb(n)) INTO exemplares FROM novos n;
 RETURN exemplares;
END $$;
CREATE OR REPLACE FUNCTION public.salvar_livro(p_id integer,p_dados jsonb,p_quantidade integer DEFAULT 0,p_prefixo text DEFAULT 'T') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE dados jsonb:=p_dados; idliv integer:=p_id; ided integer; idaut integer; nome text; colunas text; atribuicoes text; registro jsonb; exemplares jsonb:='[]';
BEGIN
 PERFORM pg_advisory_xact_lock(814701);
 IF p_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "Livro" WHERE "idLivro"=p_id FOR UPDATE) THEN RAISE EXCEPTION 'Livro não encontrado'; END IF;
 IF dados ? 'exemplarISBN' AND (nullif(btrim(dados->>'exemplarISBN'),'') IS NOT NULL OR NOT dados ? 'livISBN') THEN dados:=jsonb_set(dados,'{livISBN}',coalesce(to_jsonb(nullif(btrim(dados->>'exemplarISBN'),'')),'null'::jsonb)); END IF;
 IF dados ? 'livEditora' THEN
   nome:=nullif(btrim(dados->>'livEditora'),'');
   IF nome IS NOT NULL THEN
     SELECT "idEditora" INTO ided FROM "Editora" WHERE lower("ediNome")=lower(nome) ORDER BY "idEditora" LIMIT 1;
     IF ided IS NULL THEN INSERT INTO "Editora"("ediNome","ediCidade","ediEstado","ediPais") VALUES(nome,dados->>'ediCidade',dados->>'ediEstado',coalesce(dados->>'ediPais','Brasil')) RETURNING "idEditora" INTO ided; END IF;
   END IF;
   dados:=dados||jsonb_build_object('idEditora',ided);
 END IF;
 IF coalesce(dados->>'livTitulo','')='' AND (p_id IS NULL OR dados ? 'livTitulo') THEN RAISE EXCEPTION 'Título obrigatório'; END IF;
 IF (dados ? 'livPaginas' AND coalesce((dados->>'livPaginas')::int,0)<=0) OR (p_id IS NULL AND NOT dados ? 'livPaginas') THEN RAISE EXCEPTION 'Número de páginas deve ser positivo'; END IF;
 SELECT string_agg(format('%I',attname),',' ORDER BY attnum),string_agg(format('%I=r.%I',attname,attname),',' ORDER BY attnum)
 INTO colunas,atribuicoes FROM pg_attribute WHERE attrelid='"Livro"'::regclass AND attnum>0 AND NOT attisdropped AND attname<>'idLivro' AND dados ? attname::text;
 IF p_id IS NULL THEN
   EXECUTE format('INSERT INTO "Livro" (%s) SELECT %s FROM jsonb_populate_record(NULL::"Livro",$1) RETURNING "idLivro"',colunas,colunas) USING dados INTO idliv;
 ELSIF colunas IS NOT NULL THEN
   EXECUTE format('UPDATE "Livro" SET %s FROM jsonb_populate_record(NULL::"Livro",$1) r WHERE "Livro"."idLivro"=$2',atribuicoes) USING dados,idliv;
 END IF;
 IF dados ? 'livAutor' THEN
   DELETE FROM "LivroAutor" WHERE "idLivro"=idliv;
   FOR nome IN SELECT DISTINCT btrim(s) FROM unnest(string_to_array(dados->>'livAutor',',')) s WHERE btrim(s)<>'' LOOP
     SELECT "idAutor" INTO idaut FROM "Autor" WHERE lower("autNome")=lower(nome) ORDER BY "idAutor" LIMIT 1;
     IF idaut IS NULL THEN INSERT INTO "Autor"("autNome","autAnoNascimento","autAnoFalecimento") VALUES(nome,(dados->>'autorAnoNascimento')::integer,(dados->>'autorAnoFalecimento')::integer) RETURNING "idAutor" INTO idaut; END IF;
     INSERT INTO "LivroAutor"("idLivro","idAutor") VALUES(idliv,idaut) ON CONFLICT DO NOTHING;
   END LOOP;
 END IF;
 IF dados ? 'idCategoria' THEN DELETE FROM "LivroCategoria" WHERE "idLivro"=idliv; IF dados->>'idCategoria' IS NOT NULL THEN INSERT INTO "LivroCategoria"("idLivro","idCategoria") VALUES(idliv,(dados->>'idCategoria')::int); END IF; END IF;
 IF dados ? 'idGenero' THEN DELETE FROM "LivroGenero" WHERE "idLivro"=idliv; IF dados->>'idGenero' IS NOT NULL THEN INSERT INTO "LivroGenero"("idLivro","idGenero") VALUES(idliv,(dados->>'idGenero')::int); END IF; END IF;
 IF p_quantidade>0 THEN exemplares:=adicionar_exemplares(idliv,p_quantidade,p_prefixo); END IF;
 SELECT to_jsonb(l) INTO registro FROM "Livro" l WHERE "idLivro"=idliv;
 RETURN jsonb_build_object('livro',registro,'exemplares',exemplares);
END $$;
CREATE OR REPLACE FUNCTION public.excluir_livro(p_id integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(814701);
 IF NOT EXISTS(SELECT 1 FROM "Livro" WHERE "idLivro"=p_id FOR UPDATE) THEN RAISE EXCEPTION 'Livro não encontrado'; END IF;
 IF EXISTS(SELECT 1 FROM "MovimentacaoExemplar" me JOIN "Exemplar" e USING("idExemplar") WHERE e."idLivro"=p_id) THEN RAISE EXCEPTION 'Livro possui histórico; utilize desativação'; END IF;
 DELETE FROM "FichaCatalografica" WHERE "idLivro"=p_id;
 DELETE FROM "LivroAutor" WHERE "idLivro"=p_id; DELETE FROM "LivroCategoria" WHERE "idLivro"=p_id; DELETE FROM "LivroGenero" WHERE "idLivro"=p_id;
 DELETE FROM "Exemplar" WHERE "idLivro"=p_id; DELETE FROM "Livro" WHERE "idLivro"=p_id;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.salvar_exemplar(p_id integer,p_dados jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE retorno jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(814701);
 IF NOT EXISTS(SELECT 1 FROM "Exemplar" WHERE "idExemplar"=p_id FOR UPDATE) THEN RAISE EXCEPTION 'Exemplar não encontrado'; END IF;
 IF p_dados ? 'exeLivStatus' THEN
   IF p_dados->>'exeLivStatus' NOT IN('Disponível','desativado','Desativado') THEN RAISE EXCEPTION 'Use o fluxo de circulação para reservar/emprestar'; END IF;
   IF EXISTS(SELECT 1 FROM "MovimentacaoExemplar" WHERE "idExemplar"=p_id AND "itemStatus" IN('Pendente','Aprovado','Ativo')) THEN RAISE EXCEPTION 'Exemplar possui circulação vigente'; END IF;
 END IF;
 UPDATE "Exemplar" SET "exeLivTombo"=CASE WHEN p_dados ? 'exeLivTombo' THEN p_dados->>'exeLivTombo' ELSE "exeLivTombo" END,
 "exeLivStatus"=coalesce(p_dados->>'exeLivStatus',"exeLivStatus"),
 "exeLivLocalizacao"=CASE WHEN p_dados ? 'exeLivLocalizacao' THEN p_dados->>'exeLivLocalizacao' ELSE "exeLivLocalizacao" END,
 "exeLivDescricao"=CASE WHEN p_dados ? 'exeLivDescricao' THEN p_dados->>'exeLivDescricao' ELSE "exeLivDescricao" END WHERE "idExemplar"=p_id RETURNING to_jsonb("Exemplar".*) INTO retorno;
 RETURN retorno;
END $$;
DO $$ DECLARE f regprocedure; BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('adicionar_exemplares','salvar_livro','excluir_livro','salvar_exemplar') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f); END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.mesclar_catalogo(p_tipo text,p_origem integer,p_destino integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tabela text; vinculo text; coluna text; existe boolean; n integer;
BEGIN
 PERFORM pg_advisory_xact_lock(814701);
 IF p_tipo NOT IN('Autor','Categoria','Genero') OR p_origem=p_destino THEN RAISE EXCEPTION 'Origem e destino inválidos'; END IF;
 tabela:=p_tipo;vinculo:='Livro'||p_tipo;coluna:='id'||p_tipo;
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE %I=$1)',tabela,coluna) USING p_origem INTO existe;
 IF NOT existe THEN RAISE EXCEPTION 'Origem não encontrada'; END IF;
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE %I=$1)',tabela,coluna) USING p_destino INTO existe;
 IF NOT existe THEN RAISE EXCEPTION 'Destino não encontrado'; END IF;
 EXECUTE format('INSERT INTO %I ("idLivro",%I) SELECT "idLivro",$2 FROM %I WHERE %I=$1 ON CONFLICT DO NOTHING',vinculo,coluna,vinculo,coluna) USING p_origem,p_destino;
 GET DIAGNOSTICS n=ROW_COUNT;
 EXECUTE format('DELETE FROM %I WHERE %I=$1',vinculo,coluna) USING p_origem;
 EXECUTE format('DELETE FROM %I WHERE %I=$1',tabela,coluna) USING p_origem;
 RETURN jsonb_build_object('detail','Cadastros mesclados com sucesso','livros_migrados',n);
END $$;
REVOKE ALL ON FUNCTION public.mesclar_catalogo(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mesclar_catalogo(text,integer,integer) TO service_role;
