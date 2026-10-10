-- Aplicar primeiro em bancos existentes. PUBLIC também recebe EXECUTE por padrão.
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS assinatura
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'restaurar_backup_completo', 'restaurar_movimentacao',
      'restaurar_movimentacao_exemplar', 'resync_identity_sequence',
      'reservar_primeiro_exemplar_disponivel', 'listar_anos_emprestimos'
    )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.assinatura);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.assinatura);
  END LOOP;
END $$;
