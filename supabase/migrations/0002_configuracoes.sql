-- Migration 0002: Create Configuracoes table and seed default settings

CREATE TABLE IF NOT EXISTS public."Configuracoes" (
  chave text NOT NULL,
  valor text NOT NULL,
  descricao text,
  categoria text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Configuracoes_pkey" PRIMARY KEY (chave)
);

INSERT INTO public.Configuracoes (chave, valor, descricao, categoria, ativo)
VALUES
  ('nome_biblioteca', 'Biblioteca - Escola 9 de Julho de Taquaritinga', 'Nome exibido da biblioteca no sistema', 'geral', true),
  ('dias_emprestimo', '14', 'Número de dias padrão para devolução de empréstimos', 'geral', true),
  ('maximo_renovacoes', '2', 'Quantidade máxima de renovações por empréstimo', 'geral', true),
  ('livros_por_aluno', '3', 'Quantidade máxima de empréstimos ativos por aluno', 'geral', true),
  ('notificacao_email', 'true', 'Ativa notificações por email', 'notificacoes', true),
  ('notificacao_sms', 'false', 'Ativa notificações por SMS', 'notificacoes', true),
  ('lembrete_atraso', 'true', 'Envia lembrete para livros em atraso', 'notificacoes', true),
  ('lembrete_devolucao', 'true', 'Envia lembrete para devoluções próximas', 'notificacoes', true),
  ('dias_antecedencia_lembrete', '2', 'Dias de antecedência para envio de lembretes', 'notificacoes', true),
  ('timeout_sessao', '30', 'Tempo máximo de sessão em minutos', 'seguranca', true),
  ('tamanho_minimo_senha', '8', 'Comprimento mínimo exigido para senhas', 'seguranca', true),
  ('exigir_senha_forte', 'true', 'Exige senha forte para novos cadastros', 'seguranca', true),
  ('autenticacao_dois_fatores', 'false', 'Habilita autenticação de dois fatores', 'seguranca', true),
  ('tema', 'Claro', 'Tema padrão da interface', 'sistema', true),
  ('idioma', 'pt-br', 'Idioma padrão da interface', 'sistema', true),
  ('fuso_horario', 'sp', 'Fuso horário padrão do sistema', 'sistema', true),
  ('frequencia_backup', 'diario', 'Frequência padrão de backups', 'sistema', true),
  ('smtp_servidor', 'smtp.escola.com', 'Servidor SMTP para envio de emails', 'email', true),
  ('smtp_porta', '587', 'Porta SMTP', 'email', true),
  ('smtp_usuario', 'biblioteca@escola.com', 'Usuário SMTP', 'email', true),
  ('smtp_senha', '123456', 'Senha SMTP (use ambiente seguro em produção)', 'email', true),
  ('modo_debug', 'false', 'Ativa logs detalhados de debug', 'avancado', true),
  ('modo_manutencao', 'false', 'Bloqueia acesso temporariamente', 'avancado', true),
  ('log_api', 'true', 'Registra chamadas da API', 'avancado', true)
ON CONFLICT (chave) DO NOTHING;
