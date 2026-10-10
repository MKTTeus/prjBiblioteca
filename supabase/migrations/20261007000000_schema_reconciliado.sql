-- Baseline idempotente: cria bancos novos e acrescenta campos em bancos existentes.
-- Não apaga tabelas/dados existentes. Arquivos históricos estão em legacy_migrations.
CREATE TABLE IF NOT EXISTS public."Administrador" (
  "idAdmin" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "admNome" text NOT NULL, "admEmail" text NOT NULL UNIQUE,
  "admSenha" text NOT NULL, "admStatus" boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public."Usuario" (
  "idUsuario" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "idAdmin" integer REFERENCES public."Administrador"("idAdmin"),
  "usuNome" text NOT NULL, "usuEmail" text NOT NULL UNIQUE, "usuSenha" text NOT NULL,
  "usuTelefone" text NOT NULL DEFAULT '', "usuTelefoneResponsavel" text,
  "usuEndereco" text NOT NULL DEFAULT '', "usuRA" text UNIQUE, "usuCPF" text UNIQUE,
  "usuTipo" text NOT NULL, "usuStatus" boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public."Autor" (
  "idAutor" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "autNome" text NOT NULL, "autABNT" text
);
CREATE TABLE IF NOT EXISTS public."Editora" (
  "idEditora" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "ediNome" text NOT NULL
);
CREATE TABLE IF NOT EXISTS public."Categoria" (
  "idCategoria" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "catNome" text NOT NULL, "catDescricao" text
);
CREATE TABLE IF NOT EXISTS public."Genero" (
  "idGenero" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "genNome" text NOT NULL, "genDescricao" text
);
CREATE TABLE IF NOT EXISTS public."Livro" (
  "idLivro" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "livTitulo" text NOT NULL, "livDescricao" text, "livAnoPublicacao" integer,
  "livPaginas" integer NOT NULL, "livCapaCaminho" text, "livCapaURL" text,
  "livStatus" text, "idEditora" integer REFERENCES public."Editora"("idEditora"),
  "livISBN" text UNIQUE
);
CREATE TABLE IF NOT EXISTS public."Exemplar" (
  "idExemplar" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "idLivro" integer NOT NULL REFERENCES public."Livro"("idLivro"),
  "exeLivTombo" text NOT NULL UNIQUE, "exeLivStatus" text NOT NULL DEFAULT 'Disponível',
  "exeLivLocalizacao" text, "exeLivDescricao" text
);
CREATE TABLE IF NOT EXISTS public."LivroAutor" (
  "idLivro" integer REFERENCES public."Livro"("idLivro"),
  "idAutor" integer REFERENCES public."Autor"("idAutor"), PRIMARY KEY ("idLivro", "idAutor")
);
CREATE TABLE IF NOT EXISTS public."LivroCategoria" (
  "idLivro" integer REFERENCES public."Livro"("idLivro"),
  "idCategoria" integer REFERENCES public."Categoria"("idCategoria"), PRIMARY KEY ("idLivro", "idCategoria")
);
CREATE TABLE IF NOT EXISTS public."LivroGenero" (
  "idLivro" integer REFERENCES public."Livro"("idLivro"),
  "idGenero" integer REFERENCES public."Genero"("idGenero"), PRIMARY KEY ("idLivro", "idGenero")
);
CREATE TABLE IF NOT EXISTS public."Movimentacao" (
  "idMovimentacao" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "idUsuario" integer REFERENCES public."Usuario"("idUsuario"),
  "idAdmin" integer NOT NULL REFERENCES public."Administrador"("idAdmin"),
  "movTipo" text NOT NULL, "movStatus" text NOT NULL,
  "movDataSolicitacao" date NOT NULL DEFAULT current_date, "movDataEmprestimo" date
);
CREATE TABLE IF NOT EXISTS public."MovimentacaoExemplar" (
  "idMovimentacao" integer REFERENCES public."Movimentacao"("idMovimentacao"),
  "idExemplar" integer REFERENCES public."Exemplar"("idExemplar"),
  "dataPrevistaDevolucao" date, "dataDevolucao" date,
  "renovacoes" integer NOT NULL DEFAULT 0, "itemStatus" text,
  PRIMARY KEY ("idMovimentacao", "idExemplar")
);
CREATE TABLE IF NOT EXISTS public."Configuracoes" (
  chave text PRIMARY KEY, valor text NOT NULL, descricao text, categoria text,
  ativo boolean NOT NULL DEFAULT true, criado_em timestamptz DEFAULT now(), atualizado_em timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public."FichaCatalografica" (
  "idFicha" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "idLivro" integer NOT NULL UNIQUE REFERENCES public."Livro"("idLivro"),
  "ficTexto" text NOT NULL, "ficHtml" text, "ficCDD" text, "ficCDDOrigem" text,
  "ficGeradaPorIA" boolean DEFAULT false, "ficRevisada" boolean DEFAULT false,
  "ficVersao" integer DEFAULT 1, "ficDataGeracao" timestamptz, "ficDataRevisao" timestamptz
);
CREATE TABLE IF NOT EXISTS public."RedefinicaoSenha" (
  "idRedefinicao" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "usuEmail" text NOT NULL, "tokenHash" text NOT NULL UNIQUE,
  "expiraEm" timestamptz NOT NULL, "usadoEm" timestamptz, "criadoEm" timestamptz DEFAULT now()
);
ALTER TABLE public."Administrador"
  ADD COLUMN IF NOT EXISTS "admProfessor" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "admTema" text NOT NULL DEFAULT 'CLARO',
  ADD COLUMN IF NOT EXISTS "admTokenVersion" integer NOT NULL DEFAULT 1;
ALTER TABLE public."Usuario"
  ADD COLUMN IF NOT EXISTS "usuExcluido" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "usuSerie" text, ADD COLUMN IF NOT EXISTS "usuTurma" text,
  ADD COLUMN IF NOT EXISTS "usuAnoLetivo" integer,
  ADD COLUMN IF NOT EXISTS "usuFormado" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "usuTema" text NOT NULL DEFAULT 'CLARO',
  ADD COLUMN IF NOT EXISTS "usuSenhaProvisoria" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "usuTokenVersion" integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "usuDataNascimento" date;
ALTER TABLE public."Autor"
  ADD COLUMN IF NOT EXISTS "autAnoNascimento" integer,
  ADD COLUMN IF NOT EXISTS "autAnoFalecimento" integer;
ALTER TABLE public."Editora"
  ADD COLUMN IF NOT EXISTS "ediCidade" text, ADD COLUMN IF NOT EXISTS "ediEstado" text,
  ADD COLUMN IF NOT EXISTS "ediPais" text DEFAULT 'Brasil';
ALTER TABLE public."Livro"
  ADD COLUMN IF NOT EXISTS "livAtivo" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "livSubtitulo" text, ADD COLUMN IF NOT EXISTS "livIdioma" text,
  ADD COLUMN IF NOT EXISTS "livFaixaEtaria" text, ADD COLUMN IF NOT EXISTS "livPalavrasChave" text,
  ADD COLUMN IF NOT EXISTS "livCDD" text, ADD COLUMN IF NOT EXISTS "livCDDSugerida" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "livEdicao" integer, ADD COLUMN IF NOT EXISTS "livAlturaCm" numeric,
  ADD COLUMN IF NOT EXISTS "livLarguraCm" numeric, ADD COLUMN IF NOT EXISTS "livIlustrado" boolean DEFAULT false;
ALTER TABLE public."Movimentacao"
  ALTER COLUMN "idUsuario" DROP NOT NULL, ALTER COLUMN "movDataEmprestimo" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "data_solicitacao" timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "data_confirmacao" timestamptz,
  ADD COLUMN IF NOT EXISTS "prazo_horas" integer DEFAULT 48,
  ADD COLUMN IF NOT EXISTS "status_confirmacao" text NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS "movFinalidade" text, ADD COLUMN IF NOT EXISTS "movSerie" text,
  ADD COLUMN IF NOT EXISTS "movTurma" text,
  ADD COLUMN IF NOT EXISTS "idAdminProfessor" integer REFERENCES public."Administrador"("idAdmin"),
  ADD COLUMN IF NOT EXISTS "movUsuarioNome" text, ADD COLUMN IF NOT EXISTS "movUsuarioTipo" text,
  ADD COLUMN IF NOT EXISTS "movAnoLetivo" integer;
ALTER TABLE public."MovimentacaoExemplar"
  ADD COLUMN IF NOT EXISTS "emailAtrasoNotificadoEm" timestamptz,
  ADD COLUMN IF NOT EXISTS "emailDevolucaoNotificadoEm" timestamptz,
  ADD COLUMN IF NOT EXISTS "emailConfirmacaoNotificadoEm" timestamptz,
  ADD COLUMN IF NOT EXISTS "emailLembreteConfHoras" text;
ALTER TABLE public."RedefinicaoSenha"
  ADD COLUMN IF NOT EXISTS "contaTipo" text,
  ADD COLUMN IF NOT EXISTS "contaId" integer;
-- Sessões e tentativas não são dados restauráveis; epoch muda após restore.
CREATE TABLE IF NOT EXISTS public."SegurancaSessao" (id integer PRIMARY KEY CHECK (id = 1), epoch uuid NOT NULL DEFAULT gen_random_uuid());
INSERT INTO public."SegurancaSessao" (id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public."LimiteTentativas" (chave text PRIMARY KEY, inicio timestamptz NOT NULL, tentativas integer NOT NULL);
CREATE TABLE IF NOT EXISTS public."RequisicaoIdempotente" (chave uuid PRIMARY KEY, conta text NOT NULL, payload jsonb NOT NULL, resposta jsonb NOT NULL, criado_em timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public."ResultadoAnoLetivo" (
  "idUsuario" integer REFERENCES public."Usuario"("idUsuario"), ano integer NOT NULL,
  serie text NOT NULL, turma text, resultado text NOT NULL,
  PRIMARY KEY ("idUsuario", ano)
);
CREATE TABLE IF NOT EXISTS public."TomboContador" (prefixo text PRIMARY KEY, ultimo bigint NOT NULL);
CREATE TABLE IF NOT EXISTS public."EmailOutbox" (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, chave text UNIQUE NOT NULL,
  "idMovimentacao" integer REFERENCES public."Movimentacao"("idMovimentacao") ON DELETE CASCADE,
  tipo text NOT NULL, enviado_em timestamptz, tentativas integer DEFAULT 0,
  proxima_tentativa timestamptz DEFAULT now(), lease_ate timestamptz, lease_token uuid
);
CREATE INDEX IF NOT EXISTS idx_exemplar_livro_status ON public."Exemplar" ("idLivro", "exeLivStatus");
CREATE INDEX IF NOT EXISTS idx_mov_estado ON public."Movimentacao" ("movTipo", "movStatus", "idUsuario");
CREATE INDEX IF NOT EXISTS idx_item_estado ON public."MovimentacaoExemplar" ("itemStatus", "dataPrevistaDevolucao");
CREATE INDEX IF NOT EXISTS idx_outbox_pendente ON public."EmailOutbox" (proxima_tentativa) WHERE enviado_em IS NULL;
INSERT INTO public."Configuracoes" (chave, valor) VALUES
  ('ano_letivo_atual', '2026'), ('dias_emprestimo', '14'), ('maximo_renovacoes', '2'),
  ('livros_por_aluno', '3'), ('prazo_confirmacao_horas', '48'), ('alerta_expiracao_horas', '2'),
  ('timeout_sessao', '30'), ('notificacao_email', 'true'), ('lembrete_atraso', 'true'),
  ('lembrete_devolucao', 'true'), ('dias_antecedencia_lembrete', '2') ON CONFLICT DO NOTHING;
-- Acesso público ocorre pela API FastAPI. Nenhuma tabela de negócio requer anon.
DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Administrador','Usuario','Autor','Editora','Categoria','Genero',
    'Livro','Exemplar','LivroAutor','LivroCategoria','LivroGenero','Movimentacao',
    'MovimentacaoExemplar','Configuracoes','FichaCatalografica','RedefinicaoSenha',
    'SegurancaSessao','LimiteTentativas','RequisicaoIdempotente','ResultadoAnoLetivo',
    'TomboContador','EmailOutbox'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
-- Instalações antigas gravaram resets como timestamp UTC sem timezone.
DO $$ DECLARE c record;
BEGIN
 FOR c IN SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'
 AND ((table_name='RedefinicaoSenha' AND column_name IN('expiraEm','usadoEm','criadoEm')) OR
      (table_name='Movimentacao' AND column_name IN('data_solicitacao','data_confirmacao')))
 AND data_type='timestamp without time zone' LOOP
   EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE ''UTC''',c.table_name,c.column_name,c.column_name);
 END LOOP;
END $$;
