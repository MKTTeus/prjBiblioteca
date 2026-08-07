-- Adiciona a preferência de tema (CLARO/ESCURO) por usuário (aluno/comunidade).
-- Reaproveita o enum "preferenciatema" já existente no banco.

ALTER TABLE public."Usuario"
  ADD COLUMN IF NOT EXISTS usuTema preferenciatema NOT NULL DEFAULT 'CLARO';