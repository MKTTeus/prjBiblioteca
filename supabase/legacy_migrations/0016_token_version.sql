-- Adiciona token_version às tabelas Administrador e Usuario para invalidar
-- tokens JWT quando a conta é desativada ou a senha é alterada.

ALTER TABLE public."Administrador"
  ADD COLUMN IF NOT EXISTS "admTokenVersion" integer NOT NULL DEFAULT 1;

ALTER TABLE public."Usuario"
  ADD COLUMN IF NOT EXISTS "usuTokenVersion" integer NOT NULL DEFAULT 1;

-- Índices para acelerar a consulta de validação do token
CREATE INDEX IF NOT EXISTS idx_administrador_token_version ON public."Administrador" ("admTokenVersion");
CREATE INDEX IF NOT EXISTS idx_usuario_token_version ON public."Usuario" ("usuTokenVersion");