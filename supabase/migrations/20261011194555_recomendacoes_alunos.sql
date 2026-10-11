-- Custom JWT é validado pelo FastAPI. Nenhum cliente acessa estas relações.
CREATE TABLE public."AvaliacaoLivro" (
  "idUsuario" integer NOT NULL REFERENCES public."Usuario"("idUsuario") ON DELETE CASCADE,
  "idLivro" integer NOT NULL REFERENCES public."Livro"("idLivro") ON DELETE CASCADE,
  nota smallint NOT NULL CHECK (nota BETWEEN 1 AND 5),
  "atualizadoEm" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("idUsuario", "idLivro")
);
ALTER TABLE public."AvaliacaoLivro" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."AvaliacaoLivro" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."AvaliacaoLivro" TO service_role;
CREATE INDEX idx_avaliacao_livro ON public."AvaliacaoLivro" ("idLivro");

-- Uma linha por aluno/título, incluindo devoluções parciais. Repetir um
-- empréstimo ou devolver várias cópias não multiplica o sinal colaborativo.
CREATE VIEW public."HistoricoRecomendacao" WITH (security_invoker = true) AS
WITH historico AS (
  SELECT m."idUsuario", e."idLivro",
    bool_or(m."movTipo"='EMPRESTIMO' AND m."movDataEmprestimo" IS NOT NULL
      AND (me."itemStatus" IN ('Ativo','Atrasado') OR
        (me."itemStatus"='Devolvido' AND me."dataDevolucao" IS NOT NULL))) AS consumido,
    bool_or(m."movTipo"='EMPRESTIMO' AND m."movDataEmprestimo" IS NOT NULL
      AND me."itemStatus"='Devolvido' AND me."dataDevolucao" IS NOT NULL) AS devolvido,
    bool_or(me."itemStatus" IN ('Pendente','Aprovado','Ativo','Atrasado')
      AND me."dataDevolucao" IS NULL) AS bloqueado,
    max(me."dataDevolucao") FILTER (WHERE m."movTipo"='EMPRESTIMO'
      AND m."movDataEmprestimo" IS NOT NULL AND me."itemStatus"='Devolvido') AS "devolvidoEm"
  FROM public."Movimentacao" m
  JOIN public."Usuario" u USING ("idUsuario")
  JOIN public."MovimentacaoExemplar" me USING ("idMovimentacao")
  JOIN public."Exemplar" e USING ("idExemplar")
  WHERE u."usuTipo"='Aluno' AND u."usuStatus" AND NOT u."usuExcluido"
  GROUP BY m."idUsuario", e."idLivro"
)
SELECT h.*, a.nota FROM historico h
LEFT JOIN public."AvaliacaoLivro" a USING ("idUsuario", "idLivro")
WHERE h.consumido OR h.bloqueado;
REVOKE ALL ON public."HistoricoRecomendacao" FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public."HistoricoRecomendacao" TO service_role;

CREATE FUNCTION public.avaliar_livro(p_usuario integer, p_livro integer, p_nota integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE resultado jsonb;
BEGIN
  -- Mesma trava das operações de circulação/backup; validação e upsert atômicos.
  PERFORM pg_advisory_xact_lock(814701);
  IF p_nota IS NULL OR p_nota NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Escolha uma nota de 1 a 5';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."HistoricoRecomendacao"
    WHERE "idUsuario"=p_usuario AND "idLivro"=p_livro AND devolvido) THEN
    RAISE EXCEPTION 'A avaliação exige uma devolução confirmada do próprio aluno';
  END IF;
  INSERT INTO public."AvaliacaoLivro" ("idUsuario", "idLivro", nota)
    VALUES (p_usuario,p_livro,p_nota)
    ON CONFLICT ("idUsuario", "idLivro") DO UPDATE
      SET nota=excluded.nota, "atualizadoEm"=now()
    RETURNING jsonb_build_object('idLivro',"idLivro",'nota',nota) INTO resultado;
  RETURN resultado;
END $$;
REVOKE ALL ON FUNCTION public.avaliar_livro(integer,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.avaliar_livro(integer,integer,integer) TO service_role;

-- Inclusão no snapshot e na ordem de restauração, após suas dependências.
-- O backend passa a produzir/aceitar formato v4. Backups v3 são recusados.
CREATE OR REPLACE FUNCTION public.tabelas_backup() RETURNS text[]
LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT ARRAY['Administrador','Usuario','Autor','Editora','Categoria','Genero','Livro','Exemplar',
 'LivroAutor','LivroCategoria','LivroGenero','Movimentacao','MovimentacaoExemplar','Configuracoes',
 'FichaCatalografica','ResultadoAnoLetivo','TomboContador','EmailOutbox','RedefinicaoSenha','AvaliacaoLivro']::text[] $$;
REVOKE ALL ON FUNCTION public.tabelas_backup() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tabelas_backup() TO service_role;
NOTIFY pgrst, 'reload schema';
