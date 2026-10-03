-- Rodar agora no Supabase SQL Editor: reajusta todas as sequências de
-- identidade que podem ter ficado dessincronizadas por causa de backups
-- restaurados anteriormente (upsert com ID explícito não atualiza a sequência).

DO $$
DECLARE
  alvo record;
  seq_name text;
  maior_id bigint;
BEGIN
  FOR alvo IN
    SELECT * FROM (VALUES
      ('Genero',        'idGenero'),
      ('Categoria',     'idCategoria'),
      ('Livro',         'idLivro'),
      ('Exemplar',      'idExemplar'),
      ('Autor',         'idAutor'),
      ('Editora',       'idEditora'),
      ('Usuario',       'idUsuario'),
      ('Administrador', 'idAdmin')
    ) AS t(tabela, coluna)
  LOOP
    seq_name := pg_get_serial_sequence(format('public.%I', alvo.tabela), alvo.coluna);
    IF seq_name IS NOT NULL THEN
      EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM public.%I', alvo.coluna, alvo.tabela)
        INTO maior_id;
      IF maior_id > 0 THEN
        PERFORM setval(seq_name, maior_id, true);
      ELSE
        PERFORM setval(seq_name, 1, false);
      END IF;
      RAISE NOTICE '% -> sequência ajustada para %', alvo.tabela, maior_id;
    END IF;
  END LOOP;
END $$;