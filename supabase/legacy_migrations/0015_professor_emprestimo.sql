-- Adiciona suporte a empréstimos feitos por Professor (para si mesmo ou
-- para uma turma). Preserva o comportamento e os dados existentes:
--   - idUsuario passa a ser opcional, pois professores não possuem
--     registro em Usuario (são Administrador com admProfessor = true);
--     todas as movimentações de Aluno/Comunidade continuam preenchendo
--     idUsuario normalmente.
--   - As novas colunas ficam NULL para toda movimentação já existente
--     e só são preenchidas para movimentações criadas pelo professor.

ALTER TABLE public."Movimentacao"
  ALTER COLUMN "idUsuario" DROP NOT NULL;

ALTER TABLE public."Movimentacao"
  ADD COLUMN IF NOT EXISTS "movFinalidade" character varying,
  ADD COLUMN IF NOT EXISTS "movTurma" character varying,
  ADD COLUMN IF NOT EXISTS "movSerie" character varying;