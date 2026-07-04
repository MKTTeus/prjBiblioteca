-- Rastreia as colunas de catalogação adicionadas em Livro e a tabela
-- FichaCatalografica, que já existem em produção (criadas direto no
-- Supabase) mas nunca foram versionadas em uma migration.

ALTER TABLE public."Livro"
  ADD COLUMN IF NOT EXISTS livSubtitulo character varying,
  ADD COLUMN IF NOT EXISTS livIdioma character varying,
  ADD COLUMN IF NOT EXISTS livFaixaEtaria character varying,
  ADD COLUMN IF NOT EXISTS livPalavrasChave character varying,
  ADD COLUMN IF NOT EXISTS livCDD character varying,
  ADD COLUMN IF NOT EXISTS livCDDSugerida boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS livEdicao integer,
  ADD COLUMN IF NOT EXISTS livAlturaCm numeric,
  ADD COLUMN IF NOT EXISTS livLarguraCm numeric,
  ADD COLUMN IF NOT EXISTS livIlustrado boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public."FichaCatalografica" (
  idFicha integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  idLivro integer NOT NULL,
  ficTexto text NOT NULL,
  ficHtml text,
  ficCDD character varying,
  ficCDDOrigem character varying,
  ficGeradaPorIA boolean NOT NULL DEFAULT false,
  ficRevisada boolean NOT NULL DEFAULT false,
  ficVersao integer NOT NULL DEFAULT 1,
  ficDataGeracao timestamp without time zone,
  ficDataRevisao timestamp without time zone,
  CONSTRAINT FichaCatalografica_pkey PRIMARY KEY (idFicha),
  CONSTRAINT FichaCatalografica_idLivro_fkey FOREIGN KEY (idLivro) REFERENCES public."Livro"(idLivro),
  CONSTRAINT FichaCatalografica_idLivro_unique UNIQUE (idLivro)
);