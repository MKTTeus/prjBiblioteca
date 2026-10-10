014 admin professor · SQL
-- Adiciona o perfil de Professor à tabela Administrador existente.
-- Restringe seu acesso a funcionalidades de consulta/empréstimo.
-- Administradores existentes (admProfessor = false por padrão) mantêm
-- todas as permissões administrativas atuais.
 
ALTER TABLE public."Administrador"
  ADD COLUMN IF NOT EXISTS "admProfessor" boolean NOT NULL DEFAULT false;
 