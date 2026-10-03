-- Mantém o professor que criou a solicitação mesmo após a aprovação
-- alterar o idAdmin para o administrador responsável pela decisão.
ALTER TABLE public."Movimentacao"
  ADD COLUMN IF NOT EXISTS "idAdminProfessor" integer;

CREATE INDEX IF NOT EXISTS "idx_movimentacao_idAdminProfessor"
  ON public."Movimentacao" ("idAdminProfessor");
