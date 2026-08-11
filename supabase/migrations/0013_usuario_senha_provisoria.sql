-- Marca senhas definidas pela importação em massa ou criadas manualmente
-- pelo admin como provisórias, para exigir a troca no primeiro acesso do
-- usuário (Aluno ou Comunidade).

ALTER TABLE public."Usuario"
  ADD COLUMN IF NOT EXISTS "usuSenhaProvisoria" boolean NOT NULL DEFAULT false;