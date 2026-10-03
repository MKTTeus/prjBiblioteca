-- Migration 0017: restauração exata e transacional de backup
--
-- Contexto: o endpoint /backup/restaurar fazia apenas upsert (merge),
-- então registros criados depois do backup nunca eram removidos, e cada
-- tabela era restaurada em uma chamada REST separada — sem atomicidade
-- real (uma falha na metade deixava o banco em estado misto).
--
-- Esta migration:
--   1. Rastreia duas colunas de MovimentacaoExemplar que já existiam em
--      produção (criadas direto no Supabase, como aconteceu com
--      FichaCatalografica antes da migration 0006) mas nunca foram
--      versionadas.
--   2. Cria a função restaurar_backup_completo(dados jsonb), que apaga e
--      reinsere TODAS as tabelas dentro de uma única execução de função —
--      o que já é uma transação implícita do Postgres: se qualquer parte
--      falhar (RAISE EXCEPTION), TUDO que a função fez até ali é desfeito
--      automaticamente, sem precisar de BEGIN/COMMIT/ROLLBACK manuais e
--      sem o risco de atomicidade parcial entre múltiplas chamadas REST.

-- ─────────────────────────────────────────────
-- 1. Colunas de MovimentacaoExemplar não rastreadas anteriormente
-- ─────────────────────────────────────────────
ALTER TABLE public."MovimentacaoExemplar"
  ADD COLUMN IF NOT EXISTS "emailAtrasoNotificadoEm" timestamptz,
  ADD COLUMN IF NOT EXISTS "emailDevolucaoNotificadoEm" timestamptz;

-- ─────────────────────────────────────────────
-- 2. restaurar_backup_completo
-- ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.restaurar_backup_completo(jsonb);

CREATE OR REPLACE FUNCTION public.restaurar_backup_completo(dados jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tabelas_obrigatorias text[] := ARRAY[
    'Usuario', 'Administrador', 'Livro', 'Exemplar', 'Autor', 'Editora',
    'Categoria', 'Genero', 'LivroAutor', 'LivroCategoria', 'LivroGenero',
    'Movimentacao', 'MovimentacaoExemplar', 'Configuracoes',
    'FichaCatalografica'
  ];
  tabela text;
  restauradas jsonb := '{}'::jsonb;
  qtd integer;
  esperado integer;
BEGIN
  -- ── Validação defensiva: cada tabela obrigatória precisa existir no
  --    payload (o backend já valida isso antes de chamar esta função,
  --    mas a função não confia cegamente no chamador). ─────────────────
  FOREACH tabela IN ARRAY tabelas_obrigatorias LOOP
    IF NOT (dados ? tabela) THEN
      RAISE EXCEPTION 'Backup inválido: tabela obrigatória ausente (%)', tabela;
    END IF;
    IF jsonb_typeof(dados -> tabela) <> 'array' THEN
      RAISE EXCEPTION 'Backup inválido: tabela % não é uma lista de registros', tabela;
    END IF;
  END LOOP;

  -- ── 1. DELETE — filhos antes dos pais ───────────────────────────────
  DELETE FROM public."MovimentacaoExemplar";
  DELETE FROM public."Movimentacao";
  DELETE FROM public."FichaCatalografica";
  DELETE FROM public."LivroAutor";
  DELETE FROM public."LivroCategoria";
  DELETE FROM public."LivroGenero";
  DELETE FROM public."Exemplar";
  DELETE FROM public."Livro";
  IF dados ? 'RedefinicaoSenha' THEN
    DELETE FROM public."RedefinicaoSenha";
  END IF;
  DELETE FROM public."Usuario";
  DELETE FROM public."Editora";
  DELETE FROM public."Autor";
  DELETE FROM public."Categoria";
  DELETE FROM public."Genero";
  DELETE FROM public."Administrador";
  DELETE FROM public."Configuracoes";

  -- ── 2. INSERT — pais antes dos filhos ───────────────────────────────

  -- Administrador
  INSERT INTO public."Administrador" (
    "idAdmin", "admNome", "admEmail", "admSenha", "admStatus",
    "admProfessor", "admTema"
  )
  OVERRIDING SYSTEM VALUE
  SELECT
    r."idAdmin", r."admNome", r."admEmail", r."admSenha", r."admStatus",
    COALESCE(r."admProfessor", false),
    COALESCE(r."admTema", 'CLARO')::public.preferenciatema
  FROM jsonb_to_recordset(dados -> 'Administrador') AS r(
    "idAdmin" integer, "admNome" text, "admEmail" text, "admSenha" text,
    "admStatus" boolean, "admProfessor" boolean, "admTema" text
  );

  -- Editora
  INSERT INTO public."Editora" ("idEditora", "ediNome")
  OVERRIDING SYSTEM VALUE
  SELECT r."idEditora", r."ediNome"
  FROM jsonb_to_recordset(dados -> 'Editora') AS r("idEditora" integer, "ediNome" text);

  -- Autor
  INSERT INTO public."Autor" (
    "idAutor", "autNome", "autABNT", "autAnoNascimento", "autAnoFalecimento"
  )
  OVERRIDING SYSTEM VALUE
  SELECT r."idAutor", r."autNome", r."autABNT", r."autAnoNascimento", r."autAnoFalecimento"
  FROM jsonb_to_recordset(dados -> 'Autor') AS r(
    "idAutor" integer, "autNome" text, "autABNT" text,
    "autAnoNascimento" integer, "autAnoFalecimento" integer
  );

  -- Categoria
  INSERT INTO public."Categoria" ("idCategoria", "catNome", "catDescricao")
  OVERRIDING SYSTEM VALUE
  SELECT r."idCategoria", r."catNome", r."catDescricao"
  FROM jsonb_to_recordset(dados -> 'Categoria') AS r(
    "idCategoria" integer, "catNome" text, "catDescricao" text
  );

  -- Genero
  INSERT INTO public."Genero" ("idGenero", "genNome", "genDescricao")
  OVERRIDING SYSTEM VALUE
  SELECT r."idGenero", r."genNome", r."genDescricao"
  FROM jsonb_to_recordset(dados -> 'Genero') AS r(
    "idGenero" integer, "genNome" text, "genDescricao" text
  );

  -- Usuario (depende de Administrador)
  INSERT INTO public."Usuario" (
    "idUsuario", "idAdmin", "usuNome", "usuTelefone", "usuTelefoneResponsavel",
    "usuEndereco", "usuEmail", "usuSenha", "usuRA", "usuCPF", "usuTipo",
    "usuStatus", "usuSerie", "usuTurma", "usuAnoLetivo", "usuFormado",
    "usuTema", "usuSenhaProvisoria"
  )
  OVERRIDING SYSTEM VALUE
  SELECT
    r."idUsuario", r."idAdmin", r."usuNome", r."usuTelefone", r."usuTelefoneResponsavel",
    r."usuEndereco", r."usuEmail", r."usuSenha", r."usuRA", r."usuCPF", r."usuTipo",
    r."usuStatus", r."usuSerie", r."usuTurma", r."usuAnoLetivo",
    COALESCE(r."usuFormado", false),
    COALESCE(r."usuTema", 'CLARO')::public.preferenciatema,
    COALESCE(r."usuSenhaProvisoria", false)
  FROM jsonb_to_recordset(dados -> 'Usuario') AS r(
    "idUsuario" integer, "idAdmin" integer, "usuNome" text, "usuTelefone" text,
    "usuTelefoneResponsavel" text, "usuEndereco" text, "usuEmail" text,
    "usuSenha" text, "usuRA" text, "usuCPF" text, "usuTipo" text,
    "usuStatus" boolean, "usuSerie" text, "usuTurma" text, "usuAnoLetivo" integer,
    "usuFormado" boolean, "usuTema" text, "usuSenhaProvisoria" boolean
  );

  -- Livro (depende de Editora)
  INSERT INTO public."Livro" (
    "idLivro", "livTitulo", "livDescricao", "livAnoPublicacao", "livPaginas",
    "livCapaCaminho", "livCapaURL", "livStatus", "idEditora", "livISBN",
    "livSubtitulo", "livIdioma", "livFaixaEtaria", "livPalavrasChave",
    "livCDD", "livCDDSugerida", "livEdicao", "livAlturaCm", "livLarguraCm",
    "livIlustrado", "livAtivo"
  )
  OVERRIDING SYSTEM VALUE
  SELECT
    r."idLivro", r."livTitulo", r."livDescricao", r."livAnoPublicacao", r."livPaginas",
    r."livCapaCaminho", r."livCapaURL", r."livStatus", r."idEditora", r."livISBN",
    r."livSubtitulo", r."livIdioma", r."livFaixaEtaria", r."livPalavrasChave",
    r."livCDD", COALESCE(r."livCDDSugerida", false), r."livEdicao",
    r."livAlturaCm", r."livLarguraCm",
    COALESCE(r."livIlustrado", false), COALESCE(r."livAtivo", true)
  FROM jsonb_to_recordset(dados -> 'Livro') AS r(
    "idLivro" integer, "livTitulo" text, "livDescricao" text,
    "livAnoPublicacao" integer, "livPaginas" integer, "livCapaCaminho" text,
    "livCapaURL" text, "livStatus" text, "idEditora" integer, "livISBN" text,
    "livSubtitulo" text, "livIdioma" text, "livFaixaEtaria" text,
    "livPalavrasChave" text, "livCDD" text, "livCDDSugerida" boolean,
    "livEdicao" integer, "livAlturaCm" numeric, "livLarguraCm" numeric,
    "livIlustrado" boolean, "livAtivo" boolean
  );

  -- Exemplar (depende de Livro)
  INSERT INTO public."Exemplar" (
    "idExemplar", "idLivro", "exeLivTombo", "exeLivStatus",
    "exeLivLocalizacao", "exeLivDescricao"
  )
  OVERRIDING SYSTEM VALUE
  SELECT r."idExemplar", r."idLivro", r."exeLivTombo", r."exeLivStatus",
         r."exeLivLocalizacao", r."exeLivDescricao"
  FROM jsonb_to_recordset(dados -> 'Exemplar') AS r(
    "idExemplar" integer, "idLivro" integer, "exeLivTombo" text,
    "exeLivStatus" text, "exeLivLocalizacao" text, "exeLivDescricao" text
  );

  -- LivroAutor / LivroCategoria / LivroGenero (chave composta, sem identity)
  INSERT INTO public."LivroAutor" ("idLivro", "idAutor")
  SELECT r."idLivro", r."idAutor"
  FROM jsonb_to_recordset(dados -> 'LivroAutor') AS r("idLivro" integer, "idAutor" integer);

  INSERT INTO public."LivroCategoria" ("idCategoria", "idLivro")
  SELECT r."idCategoria", r."idLivro"
  FROM jsonb_to_recordset(dados -> 'LivroCategoria') AS r("idCategoria" integer, "idLivro" integer);

  INSERT INTO public."LivroGenero" ("idGenero", "idLivro")
  SELECT r."idGenero", r."idLivro"
  FROM jsonb_to_recordset(dados -> 'LivroGenero') AS r("idGenero" integer, "idLivro" integer);

  -- FichaCatalografica (depende de Livro)
  INSERT INTO public."FichaCatalografica" (
    "idFicha", "idLivro", "ficTexto", "ficHtml", "ficCDD", "ficCDDOrigem",
    "ficGeradaPorIA", "ficRevisada", "ficVersao", "ficDataGeracao", "ficDataRevisao"
  )
  OVERRIDING SYSTEM VALUE
  SELECT
    r."idFicha", r."idLivro", r."ficTexto", r."ficHtml", r."ficCDD", r."ficCDDOrigem",
    COALESCE(r."ficGeradaPorIA", false), COALESCE(r."ficRevisada", false),
    COALESCE(r."ficVersao", 1), r."ficDataGeracao", r."ficDataRevisao"
  FROM jsonb_to_recordset(dados -> 'FichaCatalografica') AS r(
    "idFicha" integer, "idLivro" integer, "ficTexto" text, "ficHtml" text,
    "ficCDD" text, "ficCDDOrigem" text, "ficGeradaPorIA" boolean,
    "ficRevisada" boolean, "ficVersao" integer,
    "ficDataGeracao" timestamp, "ficDataRevisao" timestamp
  );

  -- Movimentacao (depende de Usuario/Administrador)
  INSERT INTO public."Movimentacao" (
    "idMovimentacao", "idUsuario", "idAdmin", "movTipo", "movStatus",
    "movDataSolicitacao", "movDataEmprestimo", "data_solicitacao",
    "data_confirmacao", "prazo_horas", "status_confirmacao",
    "movFinalidade", "movTurma", "movSerie", "idAdminProfessor"
  )
  OVERRIDING SYSTEM VALUE
  SELECT
    r."idMovimentacao", r."idUsuario", r."idAdmin",
    r."movTipo"::public.tipomovimentacao, r."movStatus",
    r."movDataSolicitacao", r."movDataEmprestimo",
    COALESCE(r."data_solicitacao", now()),
    r."data_confirmacao", COALESCE(r."prazo_horas", 48),
    COALESCE(r."status_confirmacao", 'PENDENTE'),
    r."movFinalidade", r."movTurma", r."movSerie", r."idAdminProfessor"
  FROM jsonb_to_recordset(dados -> 'Movimentacao') AS r(
    "idMovimentacao" integer, "idUsuario" integer, "idAdmin" integer,
    "movTipo" text, "movStatus" text, "movDataSolicitacao" date,
    "movDataEmprestimo" date, "data_solicitacao" timestamptz,
    "data_confirmacao" timestamptz, "prazo_horas" integer,
    "status_confirmacao" text, "movFinalidade" text, "movTurma" text,
    "movSerie" text, "idAdminProfessor" integer
  );

  -- MovimentacaoExemplar (depende de Movimentacao/Exemplar, sem identity própria)
  INSERT INTO public."MovimentacaoExemplar" (
    "idMovimentacao", "idExemplar", "dataPrevistaDevolucao", "dataDevolucao",
    "renovacoes", "itemStatus", "emailAtrasoNotificadoEm",
    "emailDevolucaoNotificadoEm", "emailConfirmacaoNotificadoEm",
    "emailLembreteConfHoras"
  )
  SELECT
    r."idMovimentacao", r."idExemplar", r."dataPrevistaDevolucao", r."dataDevolucao",
    COALESCE(r."renovacoes", 0), r."itemStatus", r."emailAtrasoNotificadoEm",
    r."emailDevolucaoNotificadoEm", r."emailConfirmacaoNotificadoEm",
    r."emailLembreteConfHoras"
  FROM jsonb_to_recordset(dados -> 'MovimentacaoExemplar') AS r(
    "idMovimentacao" integer, "idExemplar" integer,
    "dataPrevistaDevolucao" date, "dataDevolucao" date, "renovacoes" integer,
    "itemStatus" text, "emailAtrasoNotificadoEm" timestamptz,
    "emailDevolucaoNotificadoEm" timestamptz,
    "emailConfirmacaoNotificadoEm" timestamptz, "emailLembreteConfHoras" text
  );

  -- RedefinicaoSenha (opcional — só existe no payload se o backend decidiu incluí-la)
  IF dados ? 'RedefinicaoSenha' THEN
    INSERT INTO public."RedefinicaoSenha" (
      "idRedefinicao", "usuEmail", "tokenHash", "expiraEm", "usadoEm", "criadoEm"
    )
    OVERRIDING SYSTEM VALUE
    SELECT
      r."idRedefinicao", r."usuEmail", r."tokenHash", r."expiraEm", r."usadoEm",
      COALESCE(r."criadoEm", now())
    FROM jsonb_to_recordset(dados -> 'RedefinicaoSenha') AS r(
      "idRedefinicao" integer, "usuEmail" text, "tokenHash" text,
      "expiraEm" timestamp, "usadoEm" timestamp, "criadoEm" timestamp
    );
  END IF;

  -- Configuracoes (chave é a PK, sem identity)
  INSERT INTO public."Configuracoes" (
    "chave", "valor", "descricao", "categoria", "ativo", "criado_em", "atualizado_em"
  )
  SELECT
    r."chave", r."valor", r."descricao", r."categoria",
    COALESCE(r."ativo", true),
    COALESCE(r."criado_em", now()), COALESCE(r."atualizado_em", now())
  FROM jsonb_to_recordset(dados -> 'Configuracoes') AS r(
    "chave" text, "valor" text, "descricao" text, "categoria" text,
    "ativo" boolean, "criado_em" timestamptz, "atualizado_em" timestamptz
  );

  -- ── 3. Reajustar sequences (identity) ───────────────────────────────
  PERFORM public.resync_identity_sequence('Administrador', 'idAdmin');
  PERFORM public.resync_identity_sequence('Usuario', 'idUsuario');
  PERFORM public.resync_identity_sequence('Livro', 'idLivro');
  PERFORM public.resync_identity_sequence('Exemplar', 'idExemplar');
  PERFORM public.resync_identity_sequence('Autor', 'idAutor');
  PERFORM public.resync_identity_sequence('Editora', 'idEditora');
  PERFORM public.resync_identity_sequence('Categoria', 'idCategoria');
  PERFORM public.resync_identity_sequence('Genero', 'idGenero');
  PERFORM public.resync_identity_sequence('Movimentacao', 'idMovimentacao');
  PERFORM public.resync_identity_sequence('FichaCatalografica', 'idFicha');
  IF dados ? 'RedefinicaoSenha' THEN
    PERFORM public.resync_identity_sequence('RedefinicaoSenha', 'idRedefinicao');
  END IF;

  -- ── 4. Validação de integridade — contagem de linhas por tabela ─────
  FOREACH tabela IN ARRAY (
    tabelas_obrigatorias || CASE WHEN dados ? 'RedefinicaoSenha'
                                  THEN ARRAY['RedefinicaoSenha']
                                  ELSE ARRAY[]::text[] END
  ) LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', tabela) INTO qtd;
    esperado := jsonb_array_length(dados -> tabela);
    IF qtd <> esperado THEN
      RAISE EXCEPTION
        'Falha de integridade na restauração da tabela %: % linhas no banco, % esperadas no backup',
        tabela, qtd, esperado;
    END IF;
    restauradas := restauradas || jsonb_build_object(tabela, qtd);
  END LOOP;

  RETURN restauradas;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restaurar_backup_completo(jsonb) TO anon, authenticated, service_role;