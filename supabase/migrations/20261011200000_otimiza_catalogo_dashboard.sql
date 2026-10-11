-- Catálogo agregado em uma única ida ao Postgres. Evita dezenas de chamadas
-- REST para livros, exemplares, autores, categorias, gêneros e editoras.
CREATE OR REPLACE FUNCTION public.catalogo_livros(
  p_busca text DEFAULT NULL,
  p_pagina integer DEFAULT 1,
  p_por_pagina integer DEFAULT 20,
  p_incluir_inativos boolean DEFAULT false,
  p_incluir_sem_exemplares boolean DEFAULT false
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
WITH autores AS (
  SELECT la."idLivro", string_agg(a."autNome", ', ' ORDER BY a."autNome") AS nomes
  FROM public."LivroAutor" la
  JOIN public."Autor" a USING ("idAutor")
  GROUP BY la."idLivro"
), categorias AS (
  SELECT DISTINCT ON (lc."idLivro") lc."idLivro", c."idCategoria", c."catNome"
  FROM public."LivroCategoria" lc
  JOIN public."Categoria" c USING ("idCategoria")
  ORDER BY lc."idLivro", c."idCategoria"
), generos AS (
  SELECT DISTINCT ON (lg."idLivro") lg."idLivro", g."idGenero", g."genNome"
  FROM public."LivroGenero" lg
  JOIN public."Genero" g USING ("idGenero")
  ORDER BY lg."idLivro", g."idGenero"
), exemplares AS (
  SELECT e."idLivro",
    count(*)::integer AS cadastrados,
    count(*) FILTER (WHERE lower(coalesce(e."exeLivStatus", '')) NOT LIKE '%desativado%')::integer AS total,
    count(*) FILTER (WHERE lower(coalesce(e."exeLivStatus", '')) LIKE '%dispon%')::integer AS disponiveis,
    count(*) FILTER (WHERE lower(coalesce(e."exeLivStatus", '')) LIKE '%emprest%')::integer AS emprestados,
    count(*) FILTER (WHERE lower(coalesce(e."exeLivStatus", '')) LIKE '%reserv%')::integer AS reservados,
    string_agg(e."exeLivTombo", ' ') AS tombos
  FROM public."Exemplar" e
  GROUP BY e."idLivro"
), catalogo AS (
  SELECT l."idLivro",
    to_jsonb(l) || jsonb_build_object(
      'livAutor', coalesce(a.nomes, 'Autor desconhecido'),
      'livEditora', ed."ediNome",
      'ediCidade', coalesce(ed."ediCidade", ''),
      'ediEstado', coalesce(ed."ediEstado", ''),
      'ediPais', coalesce(ed."ediPais", ''),
      'idCategoria', c."idCategoria",
      'livCategoria', c."catNome",
      'idGenero', g."idGenero",
      'livGenero', g."genNome",
      'exemplares_cadastrados', coalesce(ex.cadastrados, 0),
      'exemplares_desativados', coalesce(ex.cadastrados, 0) - coalesce(ex.total, 0),
      'total_exemplares', coalesce(ex.total, 0),
      'disponiveis', coalesce(ex.disponiveis, 0),
      'emprestados', coalesce(ex.emprestados, 0),
      'reservados', coalesce(ex.reservados, 0)
    ) AS item
  FROM public."Livro" l
  LEFT JOIN autores a USING ("idLivro")
  LEFT JOIN categorias c USING ("idLivro")
  LEFT JOIN generos g USING ("idLivro")
  LEFT JOIN exemplares ex USING ("idLivro")
  LEFT JOIN public."Editora" ed USING ("idEditora")
  WHERE (p_incluir_inativos OR l."livAtivo")
    AND (p_incluir_sem_exemplares OR coalesce(ex.total, 0) > 0)
    AND (nullif(btrim(p_busca), '') IS NULL
      OR l."livTitulo" ILIKE '%' || btrim(p_busca) || '%'
      OR coalesce(a.nomes, '') ILIKE '%' || btrim(p_busca) || '%'
      OR coalesce(g."genNome", '') ILIKE '%' || btrim(p_busca) || '%'
      OR coalesce(ex.tombos, '') ILIKE '%' || btrim(p_busca) || '%')
), pagina AS (
  SELECT * FROM catalogo ORDER BY "idLivro"
  OFFSET (greatest(p_pagina, 1) - 1) * greatest(p_por_pagina, 1)
  LIMIT greatest(p_por_pagina, 1)
)
SELECT jsonb_build_object(
  'itens', coalesce((SELECT jsonb_agg(item ORDER BY "idLivro") FROM pagina), '[]'::jsonb),
  'total', (SELECT count(*) FROM catalogo)
);
$$;

CREATE OR REPLACE FUNCTION public.resumo_acervo()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
WITH exemplares AS (
  SELECT e."idLivro",
    bool_or(lower(coalesce(e."exeLivStatus", '')) NOT LIKE '%desativado%') AS no_acervo,
    bool_or(lower(coalesce(e."exeLivStatus", '')) LIKE '%dispon%') AS disponivel
  FROM public."Exemplar" e GROUP BY e."idLivro"
)
SELECT jsonb_build_object(
  'totalLivros', count(*) FILTER (WHERE l."livAtivo" AND coalesce(ex.no_acervo, false)),
  'livrosDisponiveis', count(*) FILTER (WHERE l."livAtivo" AND coalesce(ex.disponivel, false))
)
FROM public."Livro" l LEFT JOIN exemplares ex USING ("idLivro");
$$;

REVOKE ALL ON FUNCTION public.catalogo_livros(text,integer,integer,boolean,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resumo_acervo() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalogo_livros(text,integer,integer,boolean,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.resumo_acervo() TO service_role;
NOTIFY pgrst, 'reload schema';
