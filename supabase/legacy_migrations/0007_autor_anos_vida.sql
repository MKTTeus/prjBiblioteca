-- Adiciona os anos de nascimento e falecimento do autor (ambos opcionais).
-- Usados na ficha catalográfica, ao lado do nome do autor:
--   só nascimento informado  -> "1985-"
--   nascimento e falecimento -> "1839-1908"
--   nenhum informado         -> nada é exibido

ALTER TABLE public."Autor"
  ADD COLUMN IF NOT EXISTS autAnoNascimento integer,
  ADD COLUMN IF NOT EXISTS autAnoFalecimento integer;