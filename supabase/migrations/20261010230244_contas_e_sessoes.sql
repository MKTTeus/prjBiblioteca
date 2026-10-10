CREATE OR REPLACE FUNCTION public.proteger_conta() RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE email text; mudou boolean; n integer;
BEGIN
  IF current_setting('biblioteca.restaurando',true)='on' THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(814701);
  IF TG_TABLE_NAME = 'Usuario' THEN
    NEW."usuEmail" := lower(trim(NEW."usuEmail")); email := NEW."usuEmail";
    IF EXISTS (SELECT 1 FROM "Administrador" WHERE lower("admEmail") = email) THEN
      RAISE EXCEPTION 'Email já cadastrado como administrador' USING ERRCODE = '23505';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      mudou := (NEW."usuEmail", NEW."usuSenha", NEW."usuStatus", NEW."usuExcluido", NEW."usuTipo")
        IS DISTINCT FROM (OLD."usuEmail", OLD."usuSenha", OLD."usuStatus", OLD."usuExcluido", OLD."usuTipo");
      IF mudou THEN NEW."usuTokenVersion" := OLD."usuTokenVersion" + 1; END IF;
    END IF;
  ELSE
    NEW."admEmail" := lower(trim(NEW."admEmail")); email := NEW."admEmail";
    IF EXISTS (SELECT 1 FROM "Usuario" WHERE lower("usuEmail") = email) THEN
      RAISE EXCEPTION 'Email já cadastrado como usuário' USING ERRCODE = '23505';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF OLD."admStatus" AND NOT OLD."admProfessor" AND (NOT NEW."admStatus" OR NEW."admProfessor") THEN
        SELECT count(*) INTO n FROM "Administrador" WHERE "admStatus" AND NOT "admProfessor" AND "idAdmin" <> OLD."idAdmin";
        IF n = 0 THEN RAISE EXCEPTION 'Não é possível remover o último gestor ativo'; END IF;
      END IF;
      mudou := (NEW."admEmail", NEW."admSenha", NEW."admStatus", NEW."admProfessor")
        IS DISTINCT FROM (OLD."admEmail", OLD."admSenha", OLD."admStatus", OLD."admProfessor");
      IF mudou THEN NEW."admTokenVersion" := OLD."admTokenVersion" + 1; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_conta ON public."Usuario";
CREATE TRIGGER proteger_conta BEFORE INSERT OR UPDATE ON public."Usuario" FOR EACH ROW EXECUTE FUNCTION public.proteger_conta();
DROP TRIGGER IF EXISTS proteger_conta ON public."Administrador";
CREATE TRIGGER proteger_conta BEFORE INSERT OR UPDATE ON public."Administrador" FOR EACH ROW EXECUTE FUNCTION public.proteger_conta();
CREATE OR REPLACE FUNCTION public.consumir_reset(p_hash text, p_senha text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r "RedefinicaoSenha"%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(814701);
  SELECT * INTO r FROM "RedefinicaoSenha" WHERE "tokenHash" = p_hash FOR UPDATE;
  IF NOT FOUND OR r."usadoEm" IS NOT NULL OR r."expiraEm" <= now() OR r."contaId" IS NULL THEN
    RAISE EXCEPTION 'Link inválido ou expirado' USING ERRCODE = 'P0001';
  END IF;
  IF r."contaTipo" = 'admin' THEN
    UPDATE "Administrador" SET "admSenha" = p_senha WHERE "idAdmin" = r."contaId" AND "admStatus";
  ELSIF r."contaTipo" = 'usuario' THEN
    UPDATE "Usuario" SET "usuSenha" = p_senha, "usuSenhaProvisoria" = false
      WHERE "idUsuario" = r."contaId" AND "usuStatus" AND NOT "usuExcluido";
  ELSE RAISE EXCEPTION 'Link inválido ou expirado';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Link inválido ou expirado'; END IF;
  UPDATE "RedefinicaoSenha" SET "usadoEm" = now()
    WHERE "contaTipo" = r."contaTipo" AND "contaId" = r."contaId" AND "usadoEm" IS NULL;
  RETURN jsonb_build_object('ok', true);
END $$;
CREATE OR REPLACE FUNCTION public.registrar_tentativa(p_chave text, p_max integer, p_janela integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM "LimiteTentativas" WHERE inicio < now() - interval '1 day';
  INSERT INTO "LimiteTentativas" (chave, inicio, tentativas) VALUES (p_chave, now(), 1)
  ON CONFLICT (chave) DO UPDATE SET
    tentativas = CASE WHEN "LimiteTentativas".inicio <= now() - make_interval(secs => p_janela) THEN 1 ELSE "LimiteTentativas".tentativas + 1 END,
    inicio = CASE WHEN "LimiteTentativas".inicio <= now() - make_interval(secs => p_janela) THEN now() ELSE "LimiteTentativas".inicio END
  RETURNING tentativas INTO n;
  RETURN n <= p_max;
END $$;
REVOKE ALL ON FUNCTION public.proteger_conta(), public.consumir_reset(text,text), public.registrar_tentativa(text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consumir_reset(text,text), public.registrar_tentativa(text,integer,integer) TO service_role;
