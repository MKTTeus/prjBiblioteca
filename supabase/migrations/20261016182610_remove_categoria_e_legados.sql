-- Remove a classificação legada por categoria e consolida a data da solicitação
-- no timestamp data_solicitacao. A aplicação passa a usar apenas Gênero.

-- Mantém a busca autocontida mesmo em instalações que ainda não receberam a
-- migration de normalização sem acentos.
CREATE OR REPLACE FUNCTION public.busca_normalizar(p_texto text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT btrim(regexp_replace(
    regexp_replace(
      lower(translate(coalesce(p_texto, ''),
        'áàâãäåÁÀÂÃÄÅéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑýÿÝ',
        'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnNyyY')),
      '[^[:alnum:][:space:]]', '', 'g'),
    '\s+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.busca_corresponde(p_texto text, p_busca text)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM unnest(string_to_array(public.busca_normalizar(p_busca), ' ')) AS t(palavra)
    WHERE palavra <> '' AND strpos(public.busca_normalizar(p_texto), palavra) = 0
  );
$$;

CREATE OR REPLACE FUNCTION public.catalogo_livros(
  p_busca text DEFAULT NULL,
  p_pagina integer DEFAULT 1,
  p_por_pagina integer DEFAULT 20,
  p_incluir_inativos boolean DEFAULT false,
  p_incluir_sem_exemplares boolean DEFAULT false
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
WITH autores AS (
  SELECT la."idLivro", string_agg(a."autNome", ', ' ORDER BY a."autNome") AS nomes
  FROM public."LivroAutor" la
  JOIN public."Autor" a USING ("idAutor")
  GROUP BY la."idLivro"
), generos AS (
  SELECT DISTINCT ON (lg."idLivro") lg."idLivro", g."idGenero", g."genNome"
  FROM public."LivroGenero" lg
  JOIN public."Genero" g USING ("idGenero")
  ORDER BY lg."idLivro", g."idGenero"
), exemplares AS (
  SELECT e."idLivro",
    count(*)::integer AS cadastrados,
    count(*) FILTER (WHERE lower(coalesce(e."exeLivStatus", '')) NOT LIKE '%desativado%')::integer AS total,
    count(*) FILTER (WHERE lower(coalesce(e."exeLivStatus", '')) LIKE '%dispon%')::integer AS disponiveis,
    count(*) FILTER (WHERE lower(coalesce(e."exeLivStatus", '')) LIKE '%emprest%')::integer AS emprestados,
    count(*) FILTER (WHERE lower(coalesce(e."exeLivStatus", '')) LIKE '%reserv%')::integer AS reservados,
    string_agg(e."exeLivTombo", ' ') AS tombos
  FROM public."Exemplar" e
  GROUP BY e."idLivro"
), catalogo AS (
  SELECT l."idLivro",
    to_jsonb(l) || jsonb_build_object(
      'livAutor', coalesce(a.nomes, 'Autor desconhecido'),
      'livEditora', ed."ediNome",
      'ediCidade', coalesce(ed."ediCidade", ''),
      'ediEstado', coalesce(ed."ediEstado", ''),
      'ediPais', coalesce(ed."ediPais", ''),
      'idGenero', g."idGenero",
      'livGenero', g."genNome",
      'exemplares_cadastrados', coalesce(ex.cadastrados, 0),
      'exemplares_desativados', coalesce(ex.cadastrados, 0) - coalesce(ex.total, 0),
      'total_exemplares', coalesce(ex.total, 0),
      'disponiveis', coalesce(ex.disponiveis, 0),
      'emprestados', coalesce(ex.emprestados, 0),
      'reservados', coalesce(ex.reservados, 0)
    ) AS item
  FROM public."Livro" l
  LEFT JOIN autores a USING ("idLivro")
  LEFT JOIN generos g USING ("idLivro")
  LEFT JOIN exemplares ex USING ("idLivro")
  LEFT JOIN public."Editora" ed USING ("idEditora")
  WHERE (p_incluir_inativos OR l."livAtivo")
    AND (p_incluir_sem_exemplares OR coalesce(ex.total, 0) > 0)
    AND public.busca_corresponde(
      concat_ws(' ', l."livTitulo", a.nomes, g."genNome", ex.tombos), p_busca)
), pagina AS (
  SELECT * FROM catalogo ORDER BY "idLivro"
  OFFSET (greatest(p_pagina, 1) - 1) * greatest(p_por_pagina, 1)
  LIMIT greatest(p_por_pagina, 1)
)
SELECT jsonb_build_object(
  'itens', coalesce((SELECT jsonb_agg(item ORDER BY "idLivro") FROM pagina), '[]'::jsonb),
  'total', (SELECT count(*) FROM catalogo)
);
$$;

CREATE OR REPLACE FUNCTION public.salvar_livro(
  p_id integer, p_dados jsonb, p_quantidade integer DEFAULT 0, p_prefixo text DEFAULT 'T'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
 DELETE FROM "LivroAutor" WHERE "idLivro"=p_id; DELETE FROM "LivroGenero" WHERE "idLivro"=p_id;
 DELETE FROM "Exemplar" WHERE "idLivro"=p_id; DELETE FROM "Livro" WHERE "idLivro"=p_id;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.mesclar_catalogo(p_tipo text,p_origem integer,p_destino integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tabela text; vinculo text; coluna text; existe boolean; n integer;
BEGIN
 PERFORM pg_advisory_xact_lock(814701);
 IF p_tipo NOT IN('Autor','Genero') OR p_origem=p_destino THEN RAISE EXCEPTION 'Origem e destino inválidos'; END IF;
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

CREATE OR REPLACE FUNCTION public.criar_movimentacao(
  p_usuario integer, p_professor integer, p_admin integer, p_itens jsonb,
  p_exemplar integer DEFAULT NULL, p_direto boolean DEFAULT false,
  p_finalidade text DEFAULT NULL, p_turma text DEFAULT NULL, p_serie text DEFAULT NULL,
  p_chave uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u "Usuario"%ROWTYPE; a "Administrador"%ROWTYPE; item record; ids integer[] := '{}'; lote integer[];
  idmov integer; gestor integer; total integer; limite integer; dias integer; resp jsonb; req jsonb; anterior "RequisicaoIdempotente"%ROWTYPE;
  conta text; estado text; hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; titulo text;
BEGIN
  PERFORM pg_advisory_xact_lock(814701);
  conta := COALESCE('usuario:' || p_usuario, 'professor:' || p_professor, 'admin:' || p_admin);
  req := jsonb_build_object('usuario',p_usuario,'professor',p_professor,'admin',p_admin,'itens',p_itens,'exemplar',p_exemplar,'direto',p_direto,'finalidade',p_finalidade,'turma',p_turma,'serie',p_serie);
  IF p_chave IS NOT NULL THEN
    SELECT * INTO anterior FROM "RequisicaoIdempotente" WHERE chave = p_chave;
    IF FOUND THEN
      IF anterior.conta <> conta OR anterior.payload <> req THEN RAISE EXCEPTION 'Chave de requisição reutilizada com outros dados'; END IF;
      RETURN anterior.resposta;
    END IF;
  END IF;
  IF p_usuario IS NOT NULL AND p_professor IS NOT NULL THEN RAISE EXCEPTION 'Solicitante inválido'; END IF;
  IF p_usuario IS NOT NULL THEN
    SELECT * INTO u FROM "Usuario" WHERE "idUsuario" = p_usuario FOR UPDATE;
    IF NOT FOUND OR NOT u."usuStatus" OR u."usuExcluido" OR u."usuSenhaProvisoria" OR (u."usuTipo"='Aluno' AND u."usuFormado") THEN RAISE EXCEPTION 'Usuário não habilitado para empréstimo'; END IF;
    limite := config_int('livros_por_aluno', 3);
    SELECT count(*) INTO total FROM "MovimentacaoExemplar" me JOIN "Movimentacao" m USING ("idMovimentacao")
      WHERE m."idUsuario" = p_usuario AND me."itemStatus" IN ('Pendente','Aprovado','Ativo');
  ELSIF p_professor IS NOT NULL THEN
    SELECT * INTO a FROM "Administrador" WHERE "idAdmin" = p_professor FOR UPDATE;
    IF NOT FOUND OR NOT a."admStatus" OR NOT a."admProfessor" OR p_direto THEN RAISE EXCEPTION 'Professor não habilitado'; END IF;
    IF p_finalidade IS NULL OR p_finalidade NOT IN ('PESSOAL','TURMA') OR (p_finalidade='TURMA' AND COALESCE(trim(p_turma),'')='') THEN RAISE EXCEPTION 'Informe a finalidade e a turma'; END IF;
  ELSE RAISE EXCEPTION 'Solicitante obrigatório';
  END IF;
  IF p_admin IS NOT NULL THEN
    SELECT "idAdmin" INTO gestor FROM "Administrador" WHERE "idAdmin" = p_admin AND "admStatus" AND NOT "admProfessor";
  ELSE
    SELECT "idAdmin" INTO gestor FROM "Administrador" WHERE "admStatus" AND NOT "admProfessor" ORDER BY "idAdmin" LIMIT 1;
  END IF;
  IF gestor IS NULL THEN RAISE EXCEPTION 'Gestor ativo não encontrado'; END IF;
  IF p_exemplar IS NOT NULL THEN
    SELECT jsonb_build_array(jsonb_build_object('idLivro', "idLivro", 'quantidade', 1)) INTO p_itens FROM "Exemplar" WHERE "idExemplar" = p_exemplar;
  END IF;
  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN RAISE EXCEPTION 'Selecione os livros'; END IF;
  FOR item IN SELECT (v->>'idLivro')::integer AS livro, sum((v->>'quantidade')::integer)::integer AS qtd FROM jsonb_array_elements(p_itens) v GROUP BY 1 ORDER BY 1 LOOP
    IF item.qtd < 1 OR item.qtd > 500 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
    SELECT "livTitulo" INTO titulo FROM "Livro" WHERE "idLivro"=item.livro AND "livAtivo" FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Livro inexistente ou desativado'; END IF;
    SELECT array_agg(x."idExemplar") INTO lote FROM (
      SELECT e."idExemplar" FROM "Exemplar" e WHERE e."idLivro"=item.livro AND e."exeLivStatus"='Disponível'
        AND (p_exemplar IS NULL OR e."idExemplar"=p_exemplar)
        AND NOT EXISTS (SELECT 1 FROM "MovimentacaoExemplar" me WHERE me."idExemplar"=e."idExemplar" AND me."itemStatus" IN ('Pendente','Aprovado','Ativo'))
      ORDER BY e."idExemplar" LIMIT item.qtd FOR UPDATE SKIP LOCKED
    ) x;
    IF COALESCE(cardinality(lote),0) <> item.qtd THEN RAISE EXCEPTION 'Exemplares insuficientes para %', titulo; END IF;
    ids := ids || lote;
  END LOOP;
  IF p_usuario IS NOT NULL AND total + cardinality(ids) > limite THEN RAISE EXCEPTION 'Limite de empréstimos e solicitações em curso atingido'; END IF;
  dias := config_int('dias_emprestimo',14);
  IF dias < 1 OR dias > 365 THEN RAISE EXCEPTION 'Prazo de empréstimo inválido'; END IF;
  estado := CASE WHEN p_direto THEN 'Ativo' ELSE 'Pendente' END;
  IF p_direto THEN
    INSERT INTO "Movimentacao" ("idUsuario","idAdmin","movTipo","movStatus","movDataEmprestimo","status_confirmacao")
      VALUES (p_usuario,gestor,'EMPRESTIMO',estado,hoje,'RETIRADA') RETURNING "idMovimentacao" INTO idmov;
  ELSE
    INSERT INTO "Movimentacao" ("idUsuario","idAdmin","idAdminProfessor","movTipo","movStatus","status_confirmacao","movFinalidade","movTurma","movSerie")
      VALUES (p_usuario,gestor,p_professor,'SOLICITACAO',estado,'PENDENTE',p_finalidade,p_turma,p_serie) RETURNING "idMovimentacao" INTO idmov;
  END IF;
  UPDATE "Movimentacao" SET "movUsuarioNome"=COALESCE(u."usuNome",a."admNome"), "movUsuarioTipo"=CASE WHEN p_professor IS NOT NULL THEN 'Professor' ELSE u."usuTipo"::text END,
    "movSerie"=COALESCE(p_serie,u."usuSerie"), "movTurma"=COALESCE(p_turma,u."usuTurma"), "movAnoLetivo"=config_int('ano_letivo_atual',extract(year from hoje)::integer) WHERE "idMovimentacao"=idmov;
  INSERT INTO "MovimentacaoExemplar" ("idMovimentacao","idExemplar","itemStatus","dataPrevistaDevolucao")
    SELECT idmov, unnest(ids), estado, CASE WHEN p_direto THEN hoje + dias ELSE NULL END;
  UPDATE "Exemplar" SET "exeLivStatus"=CASE WHEN p_direto THEN 'Emprestado' ELSE 'Reservado' END WHERE "idExemplar"=ANY(ids);
  resp := jsonb_build_object('idMovimentacao',idmov,'status',estado,'statusConfirmacao',CASE WHEN p_direto THEN 'RETIRADA' ELSE 'PENDENTE' END,
    'totalExemplares',cardinality(ids),'totalLivros',(SELECT count(DISTINCT "idLivro") FROM "Exemplar" WHERE "idExemplar"=ANY(ids)));
  IF p_chave IS NOT NULL THEN INSERT INTO "RequisicaoIdempotente" (chave,conta,payload,resposta) VALUES(p_chave,conta,req,resp); END IF;
  RETURN resp;
END $$;

CREATE OR REPLACE FUNCTION public.tabelas_backup() RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT ARRAY['Administrador','Usuario','Autor','Editora','Genero','Livro','Exemplar',
 'LivroAutor','LivroGenero','Movimentacao','MovimentacaoExemplar','Configuracoes',
 'FichaCatalografica','ResultadoAnoLetivo','TomboContador','EmailOutbox','RedefinicaoSenha','AvaliacaoLivro']::text[] $$;

-- O RPC parcial foi substituído há muito pelo backup transacional completo e
-- ainda dependia da coluna de data antiga.
DROP FUNCTION IF EXISTS public.restaurar_movimentacao(jsonb);

ALTER TABLE public."Livro" DROP COLUMN IF EXISTS "livStatus";
ALTER TABLE public."Movimentacao" DROP COLUMN IF EXISTS "movDataSolicitacao";
DROP TABLE IF EXISTS public."LivroCategoria";
DROP TABLE IF EXISTS public."Categoria";

REVOKE ALL ON FUNCTION public.catalogo_livros(text,integer,integer,boolean,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalogo_livros(text,integer,integer,boolean,boolean) TO service_role;
REVOKE ALL ON FUNCTION public.busca_normalizar(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.busca_normalizar(text) TO service_role;
REVOKE ALL ON FUNCTION public.busca_corresponde(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.busca_corresponde(text,text) TO service_role;
REVOKE ALL ON FUNCTION public.salvar_livro(integer,jsonb,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_livro(integer,jsonb,integer,text) TO service_role;
REVOKE ALL ON FUNCTION public.excluir_livro(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_livro(integer) TO service_role;
REVOKE ALL ON FUNCTION public.mesclar_catalogo(text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mesclar_catalogo(text,integer,integer) TO service_role;
REVOKE ALL ON FUNCTION public.criar_movimentacao(integer,integer,integer,jsonb,integer,boolean,text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_movimentacao(integer,integer,integer,jsonb,integer,boolean,text,text,text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.tabelas_backup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tabelas_backup() TO service_role;

NOTIFY pgrst, 'reload schema';
