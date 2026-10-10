-- Migration 0003: RPCs de backup e restauração
-- Cria as funções usadas pelo endpoint /api/admin/backup/restaurar
-- para reinserir dados preservando IDs originais (OVERRIDING SYSTEM VALUE).

-- ─────────────────────────────────────────────
-- restaurar_movimentacao
-- ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.restaurar_movimentacao(json);
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
    r."movTipo",
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

-- ─────────────────────────────────────────────
-- restaurar_movimentacao_exemplar
-- ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.restaurar_movimentacao_exemplar(json);
DROP FUNCTION IF EXISTS public.restaurar_movimentacao_exemplar(jsonb);

CREATE OR REPLACE FUNCTION public.restaurar_movimentacao_exemplar(registros jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public."MovimentacaoExemplar" (
    "idMovimentacao",
    "idExemplar",
    "dataPrevistaDevolucao",
    "dataDevolucao",
    "renovacoes",
    "itemStatus",
    "emailAtrasoNotificadoEm",
    "emailDevolucaoNotificadoEm"
  )
  SELECT
    r."idMovimentacao",
    r."idExemplar",
    r."dataPrevistaDevolucao",
    r."dataDevolucao",
    COALESCE(r."renovacoes", 0),
    r."itemStatus",
    r."emailAtrasoNotificadoEm",
    r."emailDevolucaoNotificadoEm"
  FROM jsonb_to_recordset(registros) AS r(
    "idMovimentacao" integer,
    "idExemplar" integer,
    "dataPrevistaDevolucao" date,
    "dataDevolucao" date,
    "renovacoes" integer,
    "itemStatus" text,
    "emailAtrasoNotificadoEm" timestamptz,
    "emailDevolucaoNotificadoEm" timestamptz
  )
  ON CONFLICT ("idMovimentacao", "idExemplar") DO UPDATE SET
    "dataPrevistaDevolucao" = EXCLUDED."dataPrevistaDevolucao",
    "dataDevolucao" = EXCLUDED."dataDevolucao",
    "renovacoes" = EXCLUDED."renovacoes",
    "itemStatus" = EXCLUDED."itemStatus",
    "emailAtrasoNotificadoEm" = EXCLUDED."emailAtrasoNotificadoEm",
    "emailDevolucaoNotificadoEm" = EXCLUDED."emailDevolucaoNotificadoEm";
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.restaurar_movimentacao(jsonb)          TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restaurar_movimentacao_exemplar(jsonb) TO anon, authenticated, service_role;
