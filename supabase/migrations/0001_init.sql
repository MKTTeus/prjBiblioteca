-- Initial schema migration
-- Adjusted: replace unknown USER-DEFINED types with character varying

CREATE TABLE IF NOT EXISTS public."Administrador" (
  idAdmin integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  admNome character varying NOT NULL,
  admEmail character varying NOT NULL UNIQUE,
  admSenha character varying NOT NULL,
  admStatus boolean NOT NULL,
  CONSTRAINT Administrador_pkey PRIMARY KEY (idAdmin)
);

CREATE TABLE IF NOT EXISTS public."Autor" (
  idAutor integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  autNome character varying NOT NULL,
  autABNT character varying,
  CONSTRAINT Autor_pkey PRIMARY KEY (idAutor)
);


CREATE TABLE IF NOT EXISTS  public."Categoria" (
  idCategoria integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  catNome character varying NOT NULL,
  catDescricao character varying,
  CONSTRAINT Categoria_pkey PRIMARY KEY (idCategoria)
);

CREATE TABLE IF NOT EXISTS public."Editora" (
  idEditora integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  ediNome character varying NOT NULL,
  CONSTRAINT Editora_pkey PRIMARY KEY (idEditora)
);

CREATE TABLE IF NOT EXISTS public."Exemplar" (
  idExemplar integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  idLivro integer NOT NULL,
  exeLivTombo character varying NOT NULL UNIQUE,
  exeLivStatus character varying,
  exeLivLocalizacao character varying,
  exeLivDescricao character varying,
  CONSTRAINT Exemplar_pkey PRIMARY KEY (idExemplar),
  CONSTRAINT exemplarlivro_idlivro_fkey FOREIGN KEY (idLivro) REFERENCES public.Livro(idLivro)
);

CREATE TABLE IF NOT EXISTS public."Genero" (
  idGenero integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  genNome character varying NOT NULL,
  genDescricao character varying,
  CONSTRAINT Genero_pkey PRIMARY KEY (idGenero)
);

CREATE TABLE IF NOT EXISTS public."Livro" (
  idLivro integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  livTitulo character varying NOT NULL,
  livDescricao character varying,
  livAnoPublicacao integer,
  livPaginas integer NOT NULL,
  livCapaCaminho character varying,
  livCapaURL character varying,
  livStatus character varying,
  idEditora integer,
  livISBN character varying UNIQUE,
  CONSTRAINT Livro_pkey PRIMARY KEY (idLivro),
  CONSTRAINT Livro_idEditora_fkey FOREIGN KEY (idEditora) REFERENCES public.Editora(idEditora)
);


CREATE TABLE IF NOT EXISTS public."LivroAutor" (
  idLivro integer NOT NULL,
  idAutor integer NOT NULL,
  CONSTRAINT LivroAutor_pkey PRIMARY KEY (idLivro, idAutor),
  CONSTRAINT LivroAutor_idLivro_fkey FOREIGN KEY (idLivro) REFERENCES public.Livro(idLivro),
  CONSTRAINT LivroAutor_idAutor_fkey FOREIGN KEY (idAutor) REFERENCES public.Autor(idAutor)
);

CREATE TABLE IF NOT EXISTS  public."LivroCategoria" (
  idCategoria integer NOT NULL,
  idLivro integer NOT NULL,
  CONSTRAINT LivroCategoria_pkey PRIMARY KEY (idCategoria, idLivro),
  CONSTRAINT livrocategoria_idCategoria_fkey FOREIGN KEY (idCategoria) REFERENCES public.Categoria(idCategoria),
  CONSTRAINT livrocategoria_idLivro_fkey FOREIGN KEY (idLivro) REFERENCES public.Livro(idLivro)
);


CREATE TABLE IF NOT EXISTS public."LivroGenero" (
  idGenero integer NOT NULL,
  idLivro integer NOT NULL,
  CONSTRAINT LivroGenero_pkey PRIMARY KEY (idGenero, idLivro),
  CONSTRAINT LivroGenero_idGenero_fkey FOREIGN KEY (idGenero) REFERENCES public.Genero(idGenero),
  CONSTRAINT LivroGenero_idLivro_fkey FOREIGN KEY (idLivro) REFERENCES public.Livro(idLivro)
);

CREATE TABLE IF NOT EXISTS  public."Movimentacao" (
  idMovimentacao integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  idUsuario integer NOT NULL,
  idAdmin integer NOT NULL,
  movTipo character varying NOT NULL,
  movStatus character varying NOT NULL,
  movDataSolicitacao date NOT NULL,
  movDataEmprestimo date NOT NULL,
  CONSTRAINT Movimentacao_pkey PRIMARY KEY (idMovimentacao),
  CONSTRAINT movimentacao_idUsuario_fkey FOREIGN KEY (idUsuario) REFERENCES public.Usuario(idUsuario),
  CONSTRAINT movimentacao_idAdmin_fkey FOREIGN KEY (idAdmin) REFERENCES public.Administrador(idAdmin)
);


CREATE TABLE IF NOT EXISTS public."MovimentacaoExemplar" (
  idMovimentacao integer NOT NULL,
  idExemplar integer NOT NULL,
  dataPrevistaDevolucao date,
  dataDevolucao date,
  renovacoes integer DEFAULT 0,
  itemStatus character varying,
  CONSTRAINT MovimentacaoExemplar_pkey PRIMARY KEY (idMovimentacao, idExemplar),
  CONSTRAINT MovimentacaoExemplar_idMovimentacao_fkey FOREIGN KEY (idMovimentacao) REFERENCES public.Movimentacao(idMovimentacao),
  CONSTRAINT MovimentacaoExemplar_idExemplar_fkey FOREIGN KEY (idExemplar) REFERENCES public.Exemplar(idExemplar)
);


CREATE TABLE IF NOT EXISTS "public.Usuario" (
  idUsuario integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  idAdmin integer,
  usuNome character varying NOT NULL,
  usuTelefone character varying NOT NULL,
  usuTelefoneResponsavel character varying,
  usuEndereco character varying NOT NULL,
  usuEmail character varying NOT NULL UNIQUE,
  usuSenha character varying NOT NULL,
  usuRA character varying UNIQUE,
  usuCPF character varying UNIQUE,
  usuTipo character varying NOT NULL,
  usuStatus boolean NOT NULL,
  CONSTRAINT Usuario_pkey PRIMARY KEY (idUsuario),
  CONSTRAINT usuario_idAdmin_fkey FOREIGN KEY (idAdmin) REFERENCES public.Administrador(idAdmin)
);
