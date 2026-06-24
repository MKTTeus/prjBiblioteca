-- Migration 0004: fix restaurar_movimentacao — cast de movTipo para enum tipomovimentacao
--
-- Problema: a versão anterior (0003) inseria movTipo como text puro.
--           O campo "Movimentacao"."movTipo" é do tipo public.tipomovimentacao
--           (enum com valores: EMPRESTIMO, RESERVA, SOLICITACAO), então o INSERT
--           falhava com code 42601 "INSERT has more expressions than target columns"
--           por conta de uma coluna duplicada remanescente de tentativa anterior de cast.
--
-- Solução: remover a coluna duplicada e adicionar cast explícito ::public.tipomovimentacao
--          somente em movTipo. movStatus permanece varchar, sem cast.

DROP FUNCTION IF EXISTS public.restaurar_movimentacao(jsonb);

CREATE OR REPLACE FUNCTION public.restaurar_movimentacao(registros jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  maior_id integer;
  seq_name text;
BEGIN
  INSERT INTO public."Movimentacao" (
    "idMovimentacao",
    "idUsuario",
    "idAdmin",
    "movTipo",
    "movStatus",
    "movDataSolicitacao",
    "movDataEmprestimo"
  )
  OVERRIDING SYSTEM VALUE
  SELECT
    r."idMovimentacao",
    r."idUsuario",
    r."idAdmin",
    r."movTipo"::public.tipomovimentacao,
    r."movStatus",
    r."movDataSolicitacao",
    r."movDataEmprestimo"
  FROM jsonb_to_recordset(registros) AS r(
    "idMovimentacao" integer,
    "idUsuario" integer,
    "idAdmin" integer,
    "movTipo" text,
    "movStatus" text,
    "movDataSolicitacao" date,
    "movDataEmprestimo" date
  )
  ON CONFLICT ("idMovimentacao") DO UPDATE SET
    "idUsuario" = EXCLUDED."idUsuario",
    "idAdmin" = EXCLUDED."idAdmin",
    "movTipo" = EXCLUDED."movTipo",
    "movStatus" = EXCLUDED."movStatus",
    "movDataSolicitacao" = EXCLUDED."movDataSolicitacao",
    "movDataEmprestimo" = EXCLUDED."movDataEmprestimo";

  SELECT COALESCE(MAX("idMovimentacao"), 0)
    INTO maior_id
    FROM public."Movimentacao";

  seq_name := pg_get_serial_sequence('public."Movimentacao"', 'idMovimentacao');
  IF seq_name IS NOT NULL THEN
    IF maior_id > 0 THEN
      PERFORM setval(seq_name, maior_id, true);
    ELSE
      PERFORM setval(seq_name, 1, false);
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restaurar_movimentacao(jsonb) TO anon, authenticated, service_role;
