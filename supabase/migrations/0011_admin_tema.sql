-- Adiciona a preferência de tema (CLARO/ESCURO) por administrador.
-- Reaproveita o enum "preferenciatema" já existente no banco (mesmo usado em Usuario).

ALTER TABLE public."Administrador"
  ADD COLUMN IF NOT EXISTS admTema preferenciatema NOT NULL DEFAULT 'CLARO';