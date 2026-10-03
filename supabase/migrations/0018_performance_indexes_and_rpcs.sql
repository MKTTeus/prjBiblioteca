-- Otimizações de consultas e operações concorrentes do acervo.
-- A migração é idempotente para permitir aplicação segura em ambientes já existentes.

CREATE INDEX IF NOT EXISTS idx_exemplar_livro_status
  ON public."Exemplar" ("idLivro", "exeLivStatus");

CREATE INDEX IF NOT EXISTS idx_movimentacao_status_tipo
  ON public."Movimentacao" ("movStatus", "movTipo", "idUsuario");

CREATE INDEX IF NOT EXISTS idx_movimentacao_tipo_data
  ON public."Movimentacao" ("movTipo", "movDataEmprestimo");

CREATE INDEX IF NOT EXISTS idx_mov_exemplar_status_data
  ON public."MovimentacaoExemplar" ("itemStatus", "dataPrevistaDevolucao", "dataDevolucao");

CREATE INDEX IF NOT EXISTS idx_usuario_ra_cpf_email
  ON public."Usuario" ("usuRA", "usuCPF", "usuEmail");

CREATE INDEX IF NOT EXISTS idx_livro_busca
  ON public."Livro" (lower("livTitulo"), "livISBN");

CREATE INDEX IF NOT EXISTS idx_redefinicao_expiracao
  ON public."RedefinicaoSenha" ("expiraEm", "usadoEm");

-- Reserva exatamente uma cópia disponível por livro. FOR UPDATE SKIP LOCKED
-- evita que duas solicitações concorrentes escolham o mesmo exemplar.
CREATE OR REPLACE FUNCTION public.reservar_primeiro_exemplar_disponivel(p_id_livro integer)
RETURNS TABLE ("idExemplar" integer, "idLivro" integer, "exeLivTombo" text)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidato AS (
    SELECT e."idExemplar"
    FROM public."Exemplar" AS e
    WHERE e."idLivro" = p_id_livro
      AND e."exeLivStatus" = 'Disponível'
    ORDER BY e."idExemplar"
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public."Exemplar" AS e
     SET "exeLivStatus" = 'Reservado'
    FROM candidato
   WHERE e."idExemplar" = candidato."idExemplar"
  RETURNING e."idExemplar", e."idLivro", e."exeLivTombo";
END;
$$;

COMMENT ON FUNCTION public.reservar_primeiro_exemplar_disponivel(integer)
  IS 'Reserva atomicamente o primeiro exemplar disponível de um livro.';

CREATE OR REPLACE FUNCTION public.listar_anos_emprestimos()
RETURNS TABLE (ano integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT EXTRACT(YEAR FROM "movDataEmprestimo")::integer AS ano
  FROM public."Movimentacao"
  WHERE "movTipo" = 'EMPRESTIMO'
    AND "movDataEmprestimo" IS NOT NULL
  ORDER BY ano DESC;
$$;

COMMENT ON FUNCTION public.listar_anos_emprestimos()
  IS 'Lista os anos que possuem empréstimos registrados para relatórios.';
