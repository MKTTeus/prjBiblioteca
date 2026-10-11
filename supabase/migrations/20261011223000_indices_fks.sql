-- Índices para FKs que não são prefixo de outros índices.
-- Evitam varreduras completas em validação de chaves, exclusões e joins.
CREATE INDEX IF NOT EXISTS idx_email_outbox_idmovimentacao
  ON public."EmailOutbox" ("idMovimentacao");
CREATE INDEX IF NOT EXISTS idx_movimentacao_idadminprofessor
  ON public."Movimentacao" ("idAdminProfessor");
CREATE INDEX IF NOT EXISTS idx_movimentacao_idadmin
  ON public."Movimentacao" ("idAdmin");
CREATE INDEX IF NOT EXISTS idx_usuario_idadmin
  ON public."Usuario" ("idAdmin");
