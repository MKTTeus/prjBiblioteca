CREATE UNIQUE INDEX IF NOT EXISTS idx_exemplar_um_vinculo_vigente ON public."MovimentacaoExemplar" ("idExemplar")
  WHERE "itemStatus" IN ('Pendente', 'Aprovado', 'Ativo');
CREATE OR REPLACE FUNCTION public.config_int(p_chave text, p_default integer) RETURNS integer
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v text;
BEGIN
  SELECT valor INTO v FROM "Configuracoes" WHERE chave = p_chave;
  IF v IS NULL THEN RETURN p_default; END IF;
  RETURN v::integer;
EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Configuração numérica inválida: %', p_chave;
END $$;
CREATE OR REPLACE FUNCTION public.criar_movimentacao(
  p_usuario integer, p_professor integer, p_admin integer, p_itens jsonb,
  p_exemplar integer DEFAULT NULL, p_direto boolean DEFAULT false,
  p_finalidade text DEFAULT NULL, p_turma text DEFAULT NULL, p_serie text DEFAULT NULL,
  p_chave uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u "Usuario"%ROWTYPE; a "Administrador"%ROWTYPE; item record; ids integer[] := '{}'; lote integer[];
  idmov integer; gestor integer; total integer; limite integer; dias integer; resp jsonb; req jsonb; anterior "RequisicaoIdempotente"%ROWTYPE;
  conta text; estado text; hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; titulo text;
BEGIN
  PERFORM pg_advisory_xact_lock(814701);
  conta := COALESCE('usuario:' || p_usuario, 'professor:' || p_professor, 'admin:' || p_admin);
  req := jsonb_build_object('usuario',p_usuario,'professor',p_professor,'admin',p_admin,'itens',p_itens,'exemplar',p_exemplar,'direto',p_direto,'finalidade',p_finalidade,'turma',p_turma,'serie',p_serie);
  IF p_chave IS NOT NULL THEN
    SELECT * INTO anterior FROM "RequisicaoIdempotente" WHERE chave = p_chave;
    IF FOUND THEN
      IF anterior.conta <> conta OR anterior.payload <> req THEN RAISE EXCEPTION 'Chave de requisição reutilizada com outros dados'; END IF;
      RETURN anterior.resposta;
    END IF;
  END IF;
  IF p_usuario IS NOT NULL AND p_professor IS NOT NULL THEN RAISE EXCEPTION 'Solicitante inválido'; END IF;
  IF p_usuario IS NOT NULL THEN
    SELECT * INTO u FROM "Usuario" WHERE "idUsuario" = p_usuario FOR UPDATE;
    IF NOT FOUND OR NOT u."usuStatus" OR u."usuExcluido" OR u."usuSenhaProvisoria" OR (u."usuTipo"='Aluno' AND u."usuFormado") THEN RAISE EXCEPTION 'Usuário não habilitado para empréstimo'; END IF;
    limite := config_int('livros_por_aluno', 3);
    SELECT count(*) INTO total FROM "MovimentacaoExemplar" me JOIN "Movimentacao" m USING ("idMovimentacao")
      WHERE m."idUsuario" = p_usuario AND me."itemStatus" IN ('Pendente','Aprovado','Ativo');
  ELSIF p_professor IS NOT NULL THEN
    SELECT * INTO a FROM "Administrador" WHERE "idAdmin" = p_professor FOR UPDATE;
    IF NOT FOUND OR NOT a."admStatus" OR NOT a."admProfessor" OR p_direto THEN RAISE EXCEPTION 'Professor não habilitado'; END IF;
    IF p_finalidade IS NULL OR p_finalidade NOT IN ('PESSOAL','TURMA') OR (p_finalidade='TURMA' AND COALESCE(trim(p_turma),'')='') THEN RAISE EXCEPTION 'Informe a finalidade e a turma'; END IF;
  ELSE RAISE EXCEPTION 'Solicitante obrigatório';
  END IF;
  IF p_admin IS NOT NULL THEN
    SELECT "idAdmin" INTO gestor FROM "Administrador" WHERE "idAdmin" = p_admin AND "admStatus" AND NOT "admProfessor";
  ELSE
    SELECT "idAdmin" INTO gestor FROM "Administrador" WHERE "admStatus" AND NOT "admProfessor" ORDER BY "idAdmin" LIMIT 1;
  END IF;
  IF gestor IS NULL THEN RAISE EXCEPTION 'Gestor ativo não encontrado'; END IF;
  IF p_exemplar IS NOT NULL THEN
    SELECT jsonb_build_array(jsonb_build_object('idLivro', "idLivro", 'quantidade', 1)) INTO p_itens FROM "Exemplar" WHERE "idExemplar" = p_exemplar;
  END IF;
  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN RAISE EXCEPTION 'Selecione os livros'; END IF;
  FOR item IN SELECT (v->>'idLivro')::integer AS livro, sum((v->>'quantidade')::integer)::integer AS qtd FROM jsonb_array_elements(p_itens) v GROUP BY 1 ORDER BY 1 LOOP
    IF item.qtd < 1 OR item.qtd > 500 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
    SELECT "livTitulo" INTO titulo FROM "Livro" WHERE "idLivro"=item.livro AND "livAtivo" FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Livro inexistente ou desativado'; END IF;
    SELECT array_agg(x."idExemplar") INTO lote FROM (
      SELECT e."idExemplar" FROM "Exemplar" e WHERE e."idLivro"=item.livro AND e."exeLivStatus"='Disponível'
        AND (p_exemplar IS NULL OR e."idExemplar"=p_exemplar)
        AND NOT EXISTS (SELECT 1 FROM "MovimentacaoExemplar" me WHERE me."idExemplar"=e."idExemplar" AND me."itemStatus" IN ('Pendente','Aprovado','Ativo'))
      ORDER BY e."idExemplar" LIMIT item.qtd FOR UPDATE SKIP LOCKED
    ) x;
    IF COALESCE(cardinality(lote),0) <> item.qtd THEN RAISE EXCEPTION 'Exemplares insuficientes para %', titulo; END IF;
    ids := ids || lote;
  END LOOP;
  IF p_usuario IS NOT NULL AND total + cardinality(ids) > limite THEN RAISE EXCEPTION 'Limite de empréstimos e solicitações em curso atingido'; END IF;
  dias := config_int('dias_emprestimo',14);
  IF dias < 1 OR dias > 365 THEN RAISE EXCEPTION 'Prazo de empréstimo inválido'; END IF;
  estado := CASE WHEN p_direto THEN 'Ativo' ELSE 'Pendente' END;
  -- movTipo pode ser enum em instalações antigas: literais são convertidos pelo PostgreSQL.
  IF p_direto THEN
    INSERT INTO "Movimentacao" ("idUsuario","idAdmin","movTipo","movStatus","movDataSolicitacao","movDataEmprestimo","status_confirmacao")
      VALUES (p_usuario,gestor,'EMPRESTIMO',estado,hoje,hoje,'RETIRADA') RETURNING "idMovimentacao" INTO idmov;
  ELSE
    INSERT INTO "Movimentacao" ("idUsuario","idAdmin","idAdminProfessor","movTipo","movStatus","movDataSolicitacao","status_confirmacao","movFinalidade","movTurma","movSerie")
      VALUES (p_usuario,gestor,p_professor,'SOLICITACAO',estado,hoje,'PENDENTE',p_finalidade,p_turma,p_serie) RETURNING "idMovimentacao" INTO idmov;
  END IF;
  UPDATE "Movimentacao" SET "movUsuarioNome"=COALESCE(u."usuNome",a."admNome"), "movUsuarioTipo"=CASE WHEN p_professor IS NOT NULL THEN 'Professor' ELSE u."usuTipo"::text END,
    "movSerie"=COALESCE(p_serie,u."usuSerie"), "movTurma"=COALESCE(p_turma,u."usuTurma"), "movAnoLetivo"=config_int('ano_letivo_atual',extract(year from hoje)::integer) WHERE "idMovimentacao"=idmov;
  INSERT INTO "MovimentacaoExemplar" ("idMovimentacao","idExemplar","itemStatus","dataPrevistaDevolucao")
    SELECT idmov, unnest(ids), estado, CASE WHEN p_direto THEN hoje + dias ELSE NULL END;
  UPDATE "Exemplar" SET "exeLivStatus"=CASE WHEN p_direto THEN 'Emprestado' ELSE 'Reservado' END WHERE "idExemplar"=ANY(ids);
  resp := jsonb_build_object('idMovimentacao',idmov,'status',estado,'statusConfirmacao',CASE WHEN p_direto THEN 'RETIRADA' ELSE 'PENDENTE' END,
    'totalExemplares',cardinality(ids),'totalLivros',(SELECT count(DISTINCT "idLivro") FROM "Exemplar" WHERE "idExemplar"=ANY(ids)));
  IF p_chave IS NOT NULL THEN INSERT INTO "RequisicaoIdempotente" (chave,conta,payload,resposta) VALUES(p_chave,conta,req,resp); END IF;
  RETURN resp;
END $$;
CREATE OR REPLACE FUNCTION public.transicionar_movimentacao(
  p_id integer, p_acao text, p_admin integer DEFAULT NULL, p_professor integer DEFAULT NULL,
  p_ids integer[] DEFAULT NULL, p_nova_data date DEFAULT NULL, p_auto boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m "Movimentacao"%ROWTYPE; ids integer[]; n integer; prazo integer; dias integer;
  hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; limite timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(814701);
  SELECT * INTO m FROM "Movimentacao" WHERE "idMovimentacao"=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movimentação não encontrada'; END IF;
  IF p_professor IS NOT NULL THEN
    IF m."idAdminProfessor" IS DISTINCT FROM p_professor OR p_acao <> 'devolver' THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  ELSIF NOT p_auto AND NOT EXISTS (SELECT 1 FROM "Administrador" WHERE "idAdmin"=p_admin AND "admStatus" AND NOT "admProfessor") THEN RAISE EXCEPTION 'Gestor não habilitado';
  END IF;
  SELECT array_agg("idExemplar" ORDER BY "idExemplar") INTO ids FROM "MovimentacaoExemplar" WHERE "idMovimentacao"=p_id;
  IF ids IS NULL THEN RAISE EXCEPTION 'Movimentação sem exemplares'; END IF;
  PERFORM 1 FROM "Exemplar" WHERE "idExemplar"=ANY(ids) ORDER BY "idExemplar" FOR UPDATE;
  limite := m.data_confirmacao + make_interval(hours=>m.prazo_horas);
  IF p_acao='aprovar' THEN
    IF m."movTipo"='SOLICITACAO' AND m."movStatus"='Aprovado' THEN RETURN jsonb_build_object('message','Solicitação já aprovada','dataLimite',limite); END IF;
    IF m."movTipo"<>'SOLICITACAO' OR m."movStatus"<>'Pendente' THEN RAISE EXCEPTION 'Apenas solicitações pendentes podem ser aprovadas'; END IF;
    IF EXISTS (SELECT 1 FROM "Exemplar" WHERE "idExemplar"=ANY(ids) AND "exeLivStatus"<>'Reservado') THEN RAISE EXCEPTION 'Reserva inconsistente'; END IF;
    prazo := config_int('prazo_confirmacao_horas',48);
    IF prazo < 1 OR prazo > 720 THEN RAISE EXCEPTION 'Prazo de retirada inválido'; END IF;
    UPDATE "Movimentacao" SET "movStatus"='Aprovado',status_confirmacao='CONFIRMADA',data_confirmacao=now(),prazo_horas=prazo,"idAdmin"=p_admin WHERE "idMovimentacao"=p_id;
    UPDATE "MovimentacaoExemplar" SET "itemStatus"='Aprovado' WHERE "idMovimentacao"=p_id;
    INSERT INTO "EmailOutbox" (chave,"idMovimentacao",tipo) VALUES('aprovacao:'||p_id,p_id,'aprovacao') ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('message','Solicitação aprovada','dataConfirmacao',now(),'prazoHoras',prazo,'dataLimite',now()+make_interval(hours=>prazo));
  ELSIF p_acao IN ('rejeitar','expirar') THEN
    IF m."movTipo"='SOLICITACAO' AND m."movStatus"=(CASE WHEN p_acao='rejeitar' THEN 'Negado' ELSE 'Expirado' END) THEN RETURN jsonb_build_object('message','Solicitação já encerrada'); END IF;
    IF m."movTipo"<>'SOLICITACAO' OR m."movStatus" NOT IN ('Pendente','Aprovado') OR (p_acao='rejeitar' AND m."movStatus"<>'Pendente') THEN RAISE EXCEPTION 'Solicitação não pode ser encerrada neste estado'; END IF;
    IF p_auto AND (limite IS NULL OR limite>now() OR m.status_confirmacao<>'CONFIRMADA') THEN RETURN NULL; END IF;
    IF p_acao='expirar' AND (m."movStatus"<>'Aprovado' OR m.status_confirmacao<>'CONFIRMADA' OR limite IS NULL OR limite>now()) THEN RAISE EXCEPTION 'A expiração exige uma solicitação aprovada com prazo vencido'; END IF;
    UPDATE "Movimentacao" SET "movStatus"=CASE WHEN p_acao='rejeitar' THEN 'Negado' ELSE 'Expirado' END,
      status_confirmacao=CASE WHEN p_acao='rejeitar' THEN 'REJEITADA' ELSE 'EXPIRADA' END WHERE "idMovimentacao"=p_id;
    UPDATE "MovimentacaoExemplar" SET "itemStatus"=CASE WHEN p_acao='rejeitar' THEN 'Negado' ELSE 'Expirado' END WHERE "idMovimentacao"=p_id;
    UPDATE "Exemplar" SET "exeLivStatus"='Disponível' WHERE "idExemplar"=ANY(ids) AND "exeLivStatus"='Reservado';
    IF p_acao='expirar' THEN INSERT INTO "EmailOutbox" (chave,"idMovimentacao",tipo) VALUES('expiracao:'||p_id,p_id,'expiracao') ON CONFLICT DO NOTHING; END IF;
  ELSIF p_acao='retirar' THEN
    IF m."movTipo"='EMPRESTIMO' AND m.status_confirmacao='RETIRADA' THEN RETURN jsonb_build_object('message','Retirada já registrada'); END IF;
    IF m."movTipo"<>'SOLICITACAO' OR m."movStatus"<>'Aprovado' OR m.status_confirmacao<>'CONFIRMADA' OR limite IS NULL OR limite<=now() THEN RAISE EXCEPTION 'Solicitação inválida ou prazo de retirada expirado'; END IF;
    IF EXISTS (SELECT 1 FROM "Exemplar" WHERE "idExemplar"=ANY(ids) AND "exeLivStatus"<>'Reservado') THEN RAISE EXCEPTION 'Reserva inconsistente'; END IF;
    dias := config_int('dias_emprestimo',14);
    UPDATE "Movimentacao" SET "movTipo"='EMPRESTIMO',"movStatus"='Ativo',"movDataEmprestimo"=hoje,status_confirmacao='RETIRADA',"idAdmin"=p_admin WHERE "idMovimentacao"=p_id;
    UPDATE "MovimentacaoExemplar" SET "itemStatus"='Ativo',"dataPrevistaDevolucao"=hoje+dias WHERE "idMovimentacao"=p_id;
    UPDATE "Exemplar" SET "exeLivStatus"='Emprestado' WHERE "idExemplar"=ANY(ids);
  ELSIF p_acao='devolver' THEN
    IF m."movTipo"<>'EMPRESTIMO' THEN RAISE EXCEPTION 'Apenas empréstimos podem ser devolvidos'; END IF;
    IF p_ids IS NOT NULL THEN
      IF cardinality(p_ids)=0 OR EXISTS (SELECT 1 FROM unnest(p_ids) i WHERE NOT EXISTS (SELECT 1 FROM "MovimentacaoExemplar" WHERE "idMovimentacao"=p_id AND "idExemplar"=i)) THEN RAISE EXCEPTION 'Exemplar não pertence ao empréstimo'; END IF;
      ids := p_ids;
    END IF;
    SELECT array_agg("idExemplar") INTO ids FROM "MovimentacaoExemplar" WHERE "idMovimentacao"=p_id AND "idExemplar"=ANY(ids) AND "itemStatus"='Ativo' AND "dataDevolucao" IS NULL;
    IF ids IS NULL THEN RETURN jsonb_build_object('message','Devolução já registrada','exemplaresDevolvidos',0); END IF;
    IF m."movStatus"<>'Ativo' THEN RAISE EXCEPTION 'Empréstimo não está ativo'; END IF;
    UPDATE "MovimentacaoExemplar" SET "itemStatus"='Devolvido',"dataDevolucao"=hoje WHERE "idMovimentacao"=p_id AND "idExemplar"=ANY(ids);
    UPDATE "Exemplar" SET "exeLivStatus"='Disponível' WHERE "idExemplar"=ANY(ids);
    IF NOT EXISTS (SELECT 1 FROM "MovimentacaoExemplar" WHERE "idMovimentacao"=p_id AND "itemStatus"='Ativo') THEN UPDATE "Movimentacao" SET "movStatus"='Devolvido' WHERE "idMovimentacao"=p_id; END IF;
    RETURN jsonb_build_object('message','Devolução registrada','exemplaresDevolvidos',cardinality(ids));
  ELSIF p_acao='renovar' THEN
    IF m."movTipo"<>'EMPRESTIMO' OR m."movStatus"<>'Ativo' THEN RAISE EXCEPTION 'Somente empréstimos ativos podem ser renovados'; END IF;
    IF p_ids IS NULL OR cardinality(p_ids)=0 OR EXISTS(SELECT 1 FROM unnest(p_ids) i WHERE NOT EXISTS(SELECT 1 FROM "MovimentacaoExemplar" WHERE "idMovimentacao"=p_id AND "idExemplar"=i AND "itemStatus"='Ativo' AND "idExemplar"=ANY(p_ids))) THEN RAISE EXCEPTION 'Selecione exemplares ativos deste empréstimo'; END IF;
    IF p_nova_data IS NULL OR p_nova_data<=hoje THEN RAISE EXCEPTION 'Data de renovação inválida'; END IF;
    IF NOT EXISTS (SELECT 1 FROM "MovimentacaoExemplar" WHERE "idMovimentacao"=p_id AND "itemStatus"='Ativo' AND "idExemplar"=ANY(p_ids)) THEN RAISE EXCEPTION 'Sem itens ativos'; END IF;
    IF EXISTS (SELECT 1 FROM "MovimentacaoExemplar" WHERE "idMovimentacao"=p_id AND "itemStatus"='Ativo' AND "idExemplar"=ANY(p_ids) AND ("dataPrevistaDevolucao">=p_nova_data OR renovacoes>=config_int('maximo_renovacoes',2))) THEN RAISE EXCEPTION 'Prazo deve ser estendido e limite de renovações respeitado'; END IF;
    UPDATE "MovimentacaoExemplar" SET "dataPrevistaDevolucao"=p_nova_data,renovacoes=renovacoes+1,"emailDevolucaoNotificadoEm"=NULL,"emailAtrasoNotificadoEm"=NULL WHERE "idMovimentacao"=p_id AND "itemStatus"='Ativo' AND "idExemplar"=ANY(p_ids);
  ELSE RAISE EXCEPTION 'Ação inválida'; END IF;
  RETURN jsonb_build_object('message','Operação concluída');
END $$;
CREATE OR REPLACE FUNCTION public.processar_prazos() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m record; n integer:=0; r jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(814701);
  FOR m IN SELECT * FROM "Movimentacao" WHERE "movTipo"='SOLICITACAO' AND "movStatus"='Aprovado' AND status_confirmacao='CONFIRMADA' LOOP
    IF m.data_confirmacao + make_interval(hours=>m.prazo_horas) <= now() THEN
      r := transicionar_movimentacao(m."idMovimentacao",'expirar',p_auto=>true); IF r IS NOT NULL THEN n:=n+1; END IF;
    ELSIF m.data_confirmacao + make_interval(hours=>m.prazo_horas) <= now() + make_interval(hours=>greatest(1,least(48,config_int('alerta_expiracao_horas',2)))) THEN
      INSERT INTO "EmailOutbox" (chave,"idMovimentacao",tipo) VALUES('lembrete:'||m."idMovimentacao",m."idMovimentacao",'lembrete') ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.config_int(text,integer), public.criar_movimentacao(integer,integer,integer,jsonb,integer,boolean,text,text,text,uuid), public.transicionar_movimentacao(integer,text,integer,integer,integer[],date,boolean), public.processar_prazos() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.criar_movimentacao(integer,integer,integer,jsonb,integer,boolean,text,text,text,uuid), public.transicionar_movimentacao(integer,text,integer,integer,integer[],date,boolean), public.processar_prazos() TO service_role;
