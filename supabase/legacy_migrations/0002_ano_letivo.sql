-- Ano letivo / promoção automática de alunos
-- Adiciona campos acadêmicos ao Usuario e o ano letivo corrente do sistema.

ALTER TABLE public."Usuario" ADD COLUMN IF NOT EXISTS "usuSerie" character varying;
ALTER TABLE public."Usuario" ADD COLUMN IF NOT EXISTS "usuTurma" character varying;
ALTER TABLE public."Usuario" ADD COLUMN IF NOT EXISTS "usuAnoLetivo" integer;
ALTER TABLE public."Usuario" ADD COLUMN IF NOT EXISTS "usuFormado" boolean NOT NULL DEFAULT false;

INSERT INTO public."Configuracoes" (chave, valor, descricao, categoria, ativo)
VALUES ('ano_letivo_atual', '2026', 'Ano letivo corrente do sistema', 'academico', true)
ON CONFLICT (chave) DO NOTHING;
