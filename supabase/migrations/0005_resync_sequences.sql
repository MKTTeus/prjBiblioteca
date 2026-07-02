-- Migration 0005: RPC genérica para reajustar sequências de identidade
-- após restaurar um backup (upsert com IDs explícitos não atualiza a
-- sequência correspondente, causando "duplicate key" em inserts futuros).

CREATE OR REPLACE FUNCTION public.resync_identity_sequence(
  nome_tabela text,
  nome_coluna text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_name text;
  maior_id bigint;
BEGIN
  seq_name := pg_get_serial_sequence(format('public.%I', nome_tabela), nome_coluna);

  IF seq_name IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM public.%I', nome_coluna, nome_tabela)
    INTO maior_id;

  IF maior_id > 0 THEN
    PERFORM setval(seq_name, maior_id, true);
  ELSE
    PERFORM setval(seq_name, 1, false);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resync_identity_sequence(text, text) TO anon, authenticated, service_role;