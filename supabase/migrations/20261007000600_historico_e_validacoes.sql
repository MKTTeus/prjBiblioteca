ALTER TABLE public."Movimentacao" ADD COLUMN IF NOT EXISTS "movSnapshotEstimado" boolean NOT NULL DEFAULT false;
-- Metadados antigos não permitem reconstrução exata da matrícula na data do empréstimo.
-- Fixamos o melhor dado disponível e identificamos essa limitação no registro.
UPDATE "Movimentacao" m SET "movUsuarioNome"=u."usuNome","movUsuarioTipo"=u."usuTipo",
 "movSerie"=coalesce(m."movSerie",u."usuSerie"),"movTurma"=coalesce(m."movTurma",u."usuTurma"),
 "movAnoLetivo"=coalesce(m."movAnoLetivo",extract(year FROM coalesce(m."movDataEmprestimo",m."movDataSolicitacao"))::int),"movSnapshotEstimado"=true
FROM "Usuario" u WHERE m."idUsuario"=u."idUsuario" AND m."movUsuarioNome" IS NULL;
UPDATE "Movimentacao" m SET "movUsuarioNome"=a."admNome","movUsuarioTipo"='Professor',
 "movAnoLetivo"=coalesce(m."movAnoLetivo",extract(year FROM coalesce(m."movDataEmprestimo",m."movDataSolicitacao"))::int),"movSnapshotEstimado"=true
FROM "Administrador" a WHERE m."idAdminProfessor"=a."idAdmin" AND m."movUsuarioNome" IS NULL;
UPDATE "RedefinicaoSenha" SET "usadoEm"=now() WHERE "contaId" IS NULL AND "usadoEm" IS NULL;
-- Normalizar antes de criar os índices. Duplicatas existentes fazem a migração
-- falhar, exigindo revisão dos cadastros em vez de excluir pessoas automaticamente.
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_email_normalizado ON public."Usuario"(lower(btrim("usuEmail")));
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_email_normalizado ON public."Administrador"(lower(btrim("admEmail")));
ALTER TABLE public."Livro" ADD CONSTRAINT livro_paginas_positivas CHECK("livPaginas">0) NOT VALID;
ALTER TABLE public."Exemplar" ADD CONSTRAINT exemplar_tombo_nao_vazio CHECK(length(btrim("exeLivTombo"))>0) NOT VALID;
ALTER TABLE public."ResultadoAnoLetivo" ADD CONSTRAINT resultado_ano_valido CHECK(resultado IN('Promovido','Retido','Formado')) NOT VALID;
INSERT INTO "Configuracoes"(chave,valor) VALUES('tamanho_minimo_senha','8'),('exigir_senha_forte','false'),('frequencia_backup','diario'),('log_api','true') ON CONFLICT DO NOTHING;
UPDATE "Configuracoes" SET valor='false' WHERE chave IN('autenticacao_dois_fatores','notificacao_sms','modo_debug','modo_manutencao');
DELETE FROM "Configuracoes" WHERE chave='smtp_senha';
