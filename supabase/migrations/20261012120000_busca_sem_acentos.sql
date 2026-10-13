-- Busca sem acentos e sem diferenciar caixa/pontuação no catálogo.
-- A regra de normalização espelha src/backend/busca.py e src/utils/busca.js:
-- minúsculas, sem acentos, sem pontuação, espaços simplificados. A busca exige
-- que todas as palavras digitadas apareçam (em qualquer ordem) no texto do livro,
-- que reúne título, autores, gênero e tombos. Não depende de extensões do Postgres.
-- Tolerância a erros de digitação fica na API, só quando esta busca não acha nada.

CREATE OR REPLACE FUNCTION public.busca_normalizar(p_texto text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT btrim(regexp_replace(
    regexp_replace(
      lower(translate(coalesce(p_texto, ''),
        'áàâãäåÁÀÂÃÄÅéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑýÿÝ',
        'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnNyyY')),
      '[^[:alnum:][:space:]]', '', 'g'),
    '\s+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.busca_corresponde(p_texto text, p_busca text)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM unnest(string_to_array(public.busca_normalizar(p_busca), ' ')) AS t(palavra)
    WHERE palavra <> '' AND strpos(public.busca_normalizar(p_texto), palavra) = 0
  );
$$;

REVOKE ALL ON FUNCTION public.busca_normalizar(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.busca_corresponde(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.busca_normalizar(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.busca_corresponde(text, text) TO service_role;

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
    AND public.busca_corresponde(
      concat_ws(' ', l."livTitulo", a.nomes, g."genNome", ex.tombos), p_busca)
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

REVOKE ALL ON FUNCTION public.catalogo_livros(text,integer,integer,boolean,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalogo_livros(text,integer,integer,boolean,boolean) TO service_role;
NOTIFY pgrst, 'reload schema';
