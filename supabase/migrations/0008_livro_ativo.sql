-- Adiciona a coluna livAtivo à tabela Livro.
--
-- Até então, "excluir" um livro no cadastro apenas marcava seus Exemplares
-- como "Inativo" (sem realmente escondê-lo do catálogo, e sem opção de
-- reverter de forma clara). Agora:
--   - livAtivo = true  -> livro aparece normalmente no catálogo (padrão)
--   - livAtivo = false -> livro fica oculto do catálogo dos usuários,
--     mas continua no banco, podendo ser reativado a qualquer momento
--     (nada é apagado: Exemplares, histórico de empréstimos, etc. seguem intactos)
--
-- A exclusão permanente (DELETE /livros/{id}) passa a ser usada só para
-- corrigir um cadastro feito por engano, e é bloqueada pelo backend caso
-- o livro já tenha algum histórico de empréstimo/reserva.

ALTER TABLE public."Livro"
  ADD COLUMN IF NOT EXISTS livAtivo boolean NOT NULL DEFAULT true;