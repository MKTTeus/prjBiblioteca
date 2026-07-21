-- Tabela de tokens de redefinição de senha

CREATE TABLE IF NOT EXISTS public."RedefinicaoSenha" (
  "idRedefinicao" integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  "usuEmail" character varying NOT NULL,
  "tokenHash" character varying NOT NULL UNIQUE,
  "expiraEm" timestamp without time zone NOT NULL,
  "usadoEm" timestamp without time zone,
  "criadoEm" timestamp without time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  CONSTRAINT "RedefinicaoSenha_pkey" PRIMARY KEY ("idRedefinicao")
);

CREATE INDEX IF NOT EXISTS idx_redefinicaosenha_tokenhash
  ON public."RedefinicaoSenha" ("tokenHash");

CREATE INDEX IF NOT EXISTS idx_redefinicaosenha_usuemail
  ON public."RedefinicaoSenha" ("usuEmail");