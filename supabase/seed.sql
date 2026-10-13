-- Massa de demonstração para o Supabase local.
-- Use somente com `supabase db reset --local`. Não aplique em produção.

BEGIN;
SET LOCAL TIME ZONE 'America/Sao_Paulo';

-- Todas as contas abaixo usam a senha: Teste@123
-- Hash bcrypt fixo para tornar o seed reproduzível.

INSERT INTO public."Configuracoes" (chave, valor, descricao, categoria) VALUES
  ('nome_biblioteca', 'Biblioteca Escolar - Ambiente de Testes', 'Nome exibido no ambiente local', 'geral'),
  ('ano_letivo_atual', extract(year FROM current_date)::text, 'Ano usado na massa local', 'geral'),
  ('dias_emprestimo', '14', 'Prazo padrão de devolução', 'geral'),
  ('maximo_renovacoes', '2', 'Renovações permitidas por exemplar', 'geral'),
  ('livros_por_aluno', '3', 'Limite simultâneo por leitor', 'geral'),
  ('prazo_confirmacao_horas', '48', 'Prazo para retirada de reserva aprovada', 'geral'),
  ('alerta_expiracao_horas', '2', 'Antecedência do aviso de expiração', 'geral')
ON CONFLICT (chave) DO UPDATE SET
  valor = excluded.valor,
  descricao = excluded.descricao,
  categoria = excluded.categoria,
  atualizado_em = now();

INSERT INTO public."Administrador"
  ("admNome", "admEmail", "admSenha", "admProfessor", "admStatus") VALUES
  ('Gestora Demo', 'gestor.demo@biblioteca.local', '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', false, true),
  ('Professora Helena', 'helena.demo@biblioteca.local', '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', true, true),
  ('Professor Ricardo', 'ricardo.demo@biblioteca.local', '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', true, true),
  ('Professora Lúcia', 'lucia.demo@biblioteca.local', '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', true, true),
  ('Professor Inativo', 'professor.inativo@biblioteca.local', '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', true, false);

-- A inserção dinâmica mantém compatibilidade com instalações antigas em que
-- usuTipo ainda é enum, além do schema textual atual.
DO $$
DECLARE
  gestor integer := (SELECT "idAdmin" FROM public."Administrador" WHERE "admEmail"='gestor.demo@biblioteca.local');
  dados record;
BEGIN
FOR dados IN SELECT * FROM (VALUES
  ('Ana Souza',       'ana.demo@biblioteca.local',       '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000001', 'Rua das Flores, 10', 'DEM0001', NULL,          'Aluno',     true,  '6º Ano',    'A', extract(year FROM current_date)::integer, false, false, false, DATE '2014-03-15'),
  ('Bruno Lima',      'bruno.demo@biblioteca.local',     '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000002', 'Rua das Flores, 20', 'DEM0002', NULL,          'Aluno',     true,  '6º Ano',    'A', extract(year FROM current_date)::integer, false, false, false, DATE '2014-07-21'),
  ('Carla Mendes',    'carla.demo@biblioteca.local',     '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000003', 'Rua das Flores, 30', 'DEM0003', NULL,          'Aluno',     true,  '6º Ano',    'B', extract(year FROM current_date)::integer, false, false, false, DATE '2014-01-09'),
  ('Diego Alves',     'diego.demo@biblioteca.local',     '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000004', 'Rua das Flores, 40', 'DEM0004', NULL,          'Aluno',     true,  '7º Ano',    'A', extract(year FROM current_date)::integer, false, false, false, DATE '2013-05-18'),
  ('Elisa Rocha',     'elisa.demo@biblioteca.local',     '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000005', 'Rua das Flores, 50', 'DEM0005', NULL,          'Aluno',     true,  '7º Ano',    'A', extract(year FROM current_date)::integer, false, false, false, DATE '2013-11-02'),
  ('Fábio Nunes',     'fabio.demo@biblioteca.local',     '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000006', 'Rua das Flores, 60', 'DEM0006', NULL,          'Aluno',     true,  '7º Ano',    'B', extract(year FROM current_date)::integer, false, false, false, DATE '2013-08-14'),
  ('Gabriela Reis',   'gabriela.demo@biblioteca.local',  '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000007', 'Rua das Flores, 70', 'DEM0007', NULL,          'Aluno',     true,  '8º Ano',    'A', extract(year FROM current_date)::integer, false, false, false, DATE '2012-04-30'),
  ('Heitor Costa',    'heitor.demo@biblioteca.local',    '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000008', 'Rua das Flores, 80', 'DEM0008', NULL,          'Aluno',     true,  '8º Ano',    'B', extract(year FROM current_date)::integer, false, false, false, DATE '2012-09-12'),
  ('Iara Fernandes',  'iara.demo@biblioteca.local',      '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000009', 'Rua das Flores, 90', 'DEM0009', NULL,          'Aluno',     true,  '9º Ano',    'A', extract(year FROM current_date)::integer, false, false, false, DATE '2011-02-25'),
  ('João Martins',    'joao.demo@biblioteca.local',      '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000010', 'Rua das Flores, 100','DEM0010', NULL,          'Aluno',     true,  '1º Ano EM', 'A', extract(year FROM current_date)::integer, false, false, false, DATE '2010-06-06'),
  ('Karen Oliveira',  'karen.demo@biblioteca.local',     '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000011', 'Rua das Flores, 110','DEM0011', NULL,          'Aluno',     false, '2º Ano EM', 'A', extract(year FROM current_date)::integer, false, false, false, DATE '2009-12-19'),
  ('Lucas Pereira',   'lucas.demo@biblioteca.local',     '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000012', 'Rua das Flores, 120','DEM0012', NULL,          'Aluno',     true,  '3º Ano EM', 'B', extract(year FROM current_date)::integer, true,  false, false, DATE '2008-10-10'),
  ('Aluno Excluído',  'excluido.demo@biblioteca.local',  '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000013', 'Rua das Flores, 130','DEM0013', NULL,          'Aluno',     false, '8º Ano',    'C', extract(year FROM current_date)::integer, false, true,  false, DATE '2012-01-01'),
  ('Marina da Silva', 'marina.demo@biblioteca.local',    '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000101', 'Rua Central, 101',   NULL,      '52998224725', 'Comunidade', true,  NULL, NULL, NULL, false, false, false, DATE '1985-05-20'),
  ('Paulo Ribeiro',   'paulo.demo@biblioteca.local',     '$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK', '16990000102', 'Rua Central, 102',   NULL,      '11144477735', 'Comunidade', true,  NULL, NULL, NULL, false, false, false, DATE '1978-08-03'),
  ('Comunidade Inativa','comunidade.inativa@biblioteca.local','$2b$12$lR6pYNgs/24W11DUzL.Wjef9UqKPciKW9X.5DbS02D3t695xDVUiK','16990000103','Rua Central, 103',NULL,'12345678909','Comunidade',false,NULL,NULL,NULL,false,false,false,DATE '1990-01-01')
) AS dados("usuNome", "usuEmail", "usuSenha", "usuTelefone", "usuEndereco", "usuRA", "usuCPF",
           "usuTipo", "usuStatus", "usuSerie", "usuTurma", "usuAnoLetivo", "usuFormado",
           "usuExcluido", "usuSenhaProvisoria", "usuDataNascimento")
LOOP
  EXECUTE format($sql$
    INSERT INTO public."Usuario"
      ("idAdmin", "usuNome", "usuEmail", "usuSenha", "usuTelefone", "usuEndereco",
       "usuRA", "usuCPF", "usuTipo", "usuStatus", "usuSerie", "usuTurma",
       "usuAnoLetivo", "usuFormado", "usuExcluido", "usuSenhaProvisoria", "usuDataNascimento")
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,%L,$9,$10,$11,$12,$13,$14,$15,$16)
  $sql$, dados."usuTipo")
  USING gestor, dados."usuNome", dados."usuEmail", dados."usuSenha", dados."usuTelefone",
    dados."usuEndereco", dados."usuRA", dados."usuCPF", dados."usuStatus", dados."usuSerie",
    dados."usuTurma", dados."usuAnoLetivo", dados."usuFormado", dados."usuExcluido",
    dados."usuSenhaProvisoria", dados."usuDataNascimento";
END LOOP;
END $$;

INSERT INTO public."Autor" ("autNome", "autABNT", "autAnoNascimento", "autAnoFalecimento") VALUES
  ('Antoine de Saint-Exupéry', 'SAINT-EXUPÉRY, Antoine de', 1900, 1944),
  ('Machado de Assis', 'ASSIS, Machado de', 1839, 1908),
  ('J. K. Rowling', 'ROWLING, J. K.', 1965, NULL),
  ('Anne Frank', 'FRANK, Anne', 1929, 1945),
  ('R. J. Palacio', 'PALACIO, R. J.', 1963, NULL),
  ('George Orwell', 'ORWELL, George', 1903, 1950),
  ('Jorge Amado', 'AMADO, Jorge', 1912, 2001),
  ('Carolina Maria de Jesus', 'JESUS, Carolina Maria de', 1914, 1977),
  ('J. R. R. Tolkien', 'TOLKIEN, J. R. R.', 1892, 1973),
  ('Graciliano Ramos', 'RAMOS, Graciliano', 1892, 1953),
  ('Itamar Vieira Junior', 'VIEIRA JUNIOR, Itamar', 1979, NULL),
  ('Lewis Carroll', 'CARROLL, Lewis', 1832, 1898),
  ('Equipe Pedagógica Demo', 'EQUIPE PEDAGÓGICA DEMO', NULL, NULL),
  ('Ana Maria Machado', 'MACHADO, Ana Maria', 1941, NULL),
  ('Autor sem obra', 'OBRA, Autor sem', NULL, NULL);

INSERT INTO public."Editora" ("ediNome", "ediCidade", "ediEstado", "ediPais") VALUES
  ('Editora Horizonte', 'São Paulo', 'SP', 'Brasil'),
  ('Editora Saber', 'Rio de Janeiro', 'RJ', 'Brasil'),
  ('Editora Escola', 'Curitiba', 'PR', 'Brasil'),
  ('Editora Inativa Demo', 'Taquaritinga', 'SP', 'Brasil');

INSERT INTO public."Categoria" ("catNome", "catDescricao") VALUES
  ('Literatura', 'Obras literárias e narrativas'),
  ('Didáticos', 'Material de apoio curricular'),
  ('Referência', 'Consulta local e pesquisa'),
  ('Biografias', 'Memórias e relatos pessoais'),
  ('Juvenil', 'Leitura destinada ao público juvenil');

INSERT INTO public."Genero" ("genNome", "genDescricao") VALUES
  ('Romance', 'Narrativas longas de ficção'),
  ('Fantasia', 'Narrativas fantásticas'),
  ('Clássico', 'Obras de reconhecida permanência'),
  ('Memórias', 'Relatos e diários'),
  ('Ciências', 'Conteúdo científico'),
  ('História', 'Conteúdo histórico'),
  ('Aventura', 'Narrativas de aventura');

INSERT INTO public."Livro"
  ("livTitulo", "livDescricao", "livAnoPublicacao", "livPaginas", "livStatus", "idEditora",
   "livISBN", "livAtivo", "livIdioma", "livFaixaEtaria", "livPalavrasChave", "livCDD", "livEdicao", "livIlustrado") VALUES
  ('O Pequeno Príncipe', 'Clássico sobre amizade e responsabilidade.', 2015, 96, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Horizonte'), '9786500000001', true, 'Português', '10+', 'amizade, clássico', '843.912', 1, true),
  ('Dom Casmurro', 'Romance brasileiro para leitura orientada.', 2019, 256, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Saber'), '9786500000002', true, 'Português', '14+', 'realismo, literatura brasileira', '869.3', 2, false),
  ('Harry Potter e a Pedra Filosofal', 'Primeiro volume da série de fantasia.', 2017, 264, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Horizonte'), '9786500000003', true, 'Português', '10+', 'magia, amizade, aventura', '823.914', 1, false),
  ('O Diário de Anne Frank', 'Diário histórico e relato pessoal.', 2018, 352, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Saber'), '9786500000004', true, 'Português', '12+', 'história, memória', '940.5318', 1, true),
  ('Extraordinário', 'Narrativa sobre convivência e empatia.', 2016, 320, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Horizonte'), '9786500000005', true, 'Português', '10+', 'empatia, escola', '813.6', 1, false),
  ('A Revolução dos Bichos', 'Fábula política em edição escolar.', 2020, 152, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Saber'), '9786500000006', true, 'Português', '14+', 'política, fábula', '823.912', 1, false),
  ('Capitães da Areia', 'Romance social brasileiro.', 2014, 288, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Saber'), '9786500000007', true, 'Português', '14+', 'literatura brasileira, juventude', '869.3', 3, false),
  ('Quarto de Despejo', 'Diário e memória social brasileira.', 2019, 200, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Saber'), '9786500000008', true, 'Português', '14+', 'memória, sociedade', '869.8', 1, false),
  ('O Hobbit', 'Aventura fantástica em edição ilustrada.', 2021, 336, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Horizonte'), '9786500000009', true, 'Português', '12+', 'fantasia, aventura', '823.912', 2, true),
  ('Vidas Secas', 'Romance do modernismo brasileiro.', 2018, 176, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Saber'), '9786500000010', true, 'Português', '14+', 'sertão, modernismo', '869.3', 1, false),
  ('Torto Arado', 'Romance brasileiro contemporâneo.', 2022, 264, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Horizonte'), '9786500000011', true, 'Português', '14+', 'Brasil, identidade', '869.3', 1, false),
  ('Alice no País das Maravilhas', 'Clássico de fantasia e aventura.', 2017, 192, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Horizonte'), '9786500000012', true, 'Português', '10+', 'fantasia, aventura', '823.8', 1, true),
  ('Manual de Ciências', 'Material interdisciplinar para uso em sala.', 2026, 224, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Escola'), '9786500000013', true, 'Português', '11+', 'ciências, escola', '500', 1, true),
  ('Atlas Histórico Escolar', 'Mapas e linhas do tempo para consulta.', 2025, 160, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Escola'), '9786500000014', true, 'Português', '11+', 'história, mapas', '900', 1, true),
  ('Dicionário Escolar de Português', 'Obra de referência para consulta local.', 2024, 640, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Escola'), '9786500000015', true, 'Português', '10+', 'referência, português', '469.3', 4, false),
  ('Livro com Cadastro Incompleto', NULL, NULL, 80, 'Pendente de revisão', NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, false),
  ('Obra Desativada', 'Título preservado para histórico de controle.', 1998, 120, 'Desativado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Inativa Demo'), '9786500000017', false, 'Português', NULL, NULL, '869.3', 1, false),
  ('Exemplar em Conservação', 'Título usado para testar indisponibilidade física.', 2012, 144, 'Cadastrado', (SELECT "idEditora" FROM public."Editora" WHERE "ediNome"='Editora Escola'), '9786500000018', true, 'Português', '12+', 'conservação, teste', '028.5', 1, false);

WITH vinculos(titulo, autor) AS (VALUES
  ('O Pequeno Príncipe','Antoine de Saint-Exupéry'), ('Dom Casmurro','Machado de Assis'),
  ('Harry Potter e a Pedra Filosofal','J. K. Rowling'), ('O Diário de Anne Frank','Anne Frank'),
  ('Extraordinário','R. J. Palacio'), ('A Revolução dos Bichos','George Orwell'),
  ('Capitães da Areia','Jorge Amado'), ('Quarto de Despejo','Carolina Maria de Jesus'),
  ('O Hobbit','J. R. R. Tolkien'), ('Vidas Secas','Graciliano Ramos'),
  ('Torto Arado','Itamar Vieira Junior'), ('Alice no País das Maravilhas','Lewis Carroll'),
  ('Manual de Ciências','Equipe Pedagógica Demo'), ('Manual de Ciências','Ana Maria Machado'),
  ('Atlas Histórico Escolar','Equipe Pedagógica Demo'), ('Dicionário Escolar de Português','Equipe Pedagógica Demo'),
  ('Obra Desativada','Ana Maria Machado'), ('Exemplar em Conservação','Equipe Pedagógica Demo')
)
INSERT INTO public."LivroAutor" ("idLivro", "idAutor")
SELECT l."idLivro", a."idAutor" FROM vinculos v
JOIN public."Livro" l ON l."livTitulo"=v.titulo
JOIN public."Autor" a ON a."autNome"=v.autor;

WITH vinculos(titulo, categoria) AS (VALUES
  ('O Pequeno Príncipe','Literatura'), ('Dom Casmurro','Literatura'),
  ('Harry Potter e a Pedra Filosofal','Juvenil'), ('O Diário de Anne Frank','Biografias'),
  ('Extraordinário','Juvenil'), ('A Revolução dos Bichos','Literatura'),
  ('Capitães da Areia','Literatura'), ('Quarto de Despejo','Biografias'),
  ('O Hobbit','Juvenil'), ('Vidas Secas','Literatura'), ('Torto Arado','Literatura'),
  ('Alice no País das Maravilhas','Juvenil'), ('Manual de Ciências','Didáticos'),
  ('Atlas Histórico Escolar','Referência'), ('Dicionário Escolar de Português','Referência'),
  ('Obra Desativada','Literatura'), ('Exemplar em Conservação','Didáticos')
)
INSERT INTO public."LivroCategoria" ("idLivro", "idCategoria")
SELECT l."idLivro", c."idCategoria" FROM vinculos v
JOIN public."Livro" l ON l."livTitulo"=v.titulo
JOIN public."Categoria" c ON c."catNome"=v.categoria;

WITH vinculos(titulo, genero) AS (VALUES
  ('O Pequeno Príncipe','Clássico'), ('Dom Casmurro','Romance'),
  ('Harry Potter e a Pedra Filosofal','Fantasia'), ('O Diário de Anne Frank','Memórias'),
  ('Extraordinário','Romance'), ('A Revolução dos Bichos','Clássico'),
  ('Capitães da Areia','Romance'), ('Quarto de Despejo','Memórias'),
  ('O Hobbit','Fantasia'), ('Vidas Secas','Romance'), ('Torto Arado','Romance'),
  ('Alice no País das Maravilhas','Aventura'), ('Manual de Ciências','Ciências'),
  ('Atlas Histórico Escolar','História'), ('Obra Desativada','Romance'),
  ('Exemplar em Conservação','Ciências')
)
INSERT INTO public."LivroGenero" ("idLivro", "idGenero")
SELECT l."idLivro", g."idGenero" FROM vinculos v
JOIN public."Livro" l ON l."livTitulo"=v.titulo
JOIN public."Genero" g ON g."genNome"=v.genero;

WITH dados(titulo, tombo, status, localizacao, descricao) AS (VALUES
  ('O Pequeno Príncipe','D0001','Disponível','Estante A1','Bom estado'),
  ('O Pequeno Príncipe','D0002','Disponível','Estante A1','Bom estado'),
  ('O Pequeno Príncipe','D0003','Disponível','Estante A1','Edição ilustrada'),
  ('Dom Casmurro','D0011','Disponível','Estante A2','Bom estado'),
  ('Dom Casmurro','D0012','Disponível','Estante A2','Bom estado'),
  ('Dom Casmurro','D0013','Disponível','Estante A2','Capa com marcas de uso'),
  ('Harry Potter e a Pedra Filosofal','D0021','Disponível','Estante B1','Bom estado'),
  ('Harry Potter e a Pedra Filosofal','D0022','Disponível','Estante B1','Bom estado'),
  ('Harry Potter e a Pedra Filosofal','D0023','Disponível','Estante B1','Bom estado'),
  ('O Diário de Anne Frank','D0031','Disponível','Estante C1','Bom estado'),
  ('O Diário de Anne Frank','D0032','Disponível','Estante C1','Bom estado'),
  ('Extraordinário','D0041','Disponível','Estante B2','Bom estado'),
  ('Extraordinário','D0042','Disponível','Estante B2','Bom estado'),
  ('A Revolução dos Bichos','D0051','Disponível','Estante A3','Bom estado'),
  ('A Revolução dos Bichos','D0052','Disponível','Estante A3','Bom estado'),
  ('A Revolução dos Bichos','D0053','Disponível','Estante A3','Bom estado'),
  ('Capitães da Areia','D0061','Disponível','Estante A4','Bom estado'),
  ('Capitães da Areia','D0062','Disponível','Estante A4','Bom estado'),
  ('Quarto de Despejo','D0071','Disponível','Estante C2','Bom estado'),
  ('Quarto de Despejo','D0072','Disponível','Estante C2','Bom estado'),
  ('O Hobbit','D0081','Disponível','Estante B3','Bom estado'),
  ('O Hobbit','D0082','Disponível','Estante B3','Bom estado'),
  ('O Hobbit','D0083','Disponível','Estante B3','Bom estado'),
  ('Vidas Secas','D0091','Disponível','Estante A5','Bom estado'),
  ('Vidas Secas','D0092','Disponível','Estante A5','Bom estado'),
  ('Torto Arado','D0101','Disponível','Estante A6','Bom estado'),
  ('Torto Arado','D0102','Disponível','Estante A6','Bom estado'),
  ('Alice no País das Maravilhas','D0111','Disponível','Estante B4','Bom estado'),
  ('Alice no País das Maravilhas','D0112','Disponível','Estante B4','Bom estado'),
  ('Manual de Ciências','D0121','Disponível','Sala Didáticos','Uso em sala'),
  ('Manual de Ciências','D0122','Disponível','Sala Didáticos','Uso em sala'),
  ('Manual de Ciências','D0123','Disponível','Sala Didáticos','Uso em sala'),
  ('Atlas Histórico Escolar','D0131','Disponível','Sala Didáticos','Uso em sala'),
  ('Atlas Histórico Escolar','D0132','Disponível','Sala Didáticos','Uso em sala'),
  ('Dicionário Escolar de Português','D0141','Tombo Fixo','Sala de Leitura','Somente consulta local'),
  ('Dicionário Escolar de Português','D0142','Disponível','Estante R1','Bom estado'),
  ('Obra Desativada','D0151','Desativado','Depósito','Exemplar baixado'),
  ('Exemplar em Conservação','D0161','Indisponível','Conservação','Aguardando reparo'),
  ('Exemplar em Conservação','D0162','Disponível','Estante D1','Bom estado'),
  ('Exemplar em Conservação','D0163','Disponível','Estante D1','Bom estado')
)
INSERT INTO public."Exemplar" ("idLivro", "exeLivTombo", "exeLivStatus", "exeLivLocalizacao", "exeLivDescricao")
SELECT l."idLivro", d.tombo, d.status, d.localizacao, d.descricao
FROM dados d JOIN public."Livro" l ON l."livTitulo"=d.titulo;

INSERT INTO public."FichaCatalografica"
  ("idLivro", "ficTexto", "ficCDD", "ficCDDOrigem", "ficGeradaPorIA", "ficRevisada", "ficVersao", "ficDataGeracao", "ficDataRevisao")
SELECT "idLivro", 'Ficha catalográfica de demonstração para ' || "livTitulo", "livCDD", 'Revisão local', false, true, 1, now() - interval '30 days', now() - interval '29 days'
FROM public."Livro" WHERE "livTitulo" IN ('O Pequeno Príncipe','Dom Casmurro','O Diário de Anne Frank','Manual de Ciências');

-- Os fluxos abaixo usam as mesmas RPCs da aplicação para manter estoque e estados coerentes.
DO $$
DECLARE
  gestor integer := (SELECT "idAdmin" FROM public."Administrador" WHERE "admEmail"='gestor.demo@biblioteca.local');
  professora integer := (SELECT "idAdmin" FROM public."Administrador" WHERE "admEmail"='helena.demo@biblioteca.local');
  professor integer := (SELECT "idAdmin" FROM public."Administrador" WHERE "admEmail"='ricardo.demo@biblioteca.local');
  ana integer := (SELECT "idUsuario" FROM public."Usuario" WHERE "usuEmail"='ana.demo@biblioteca.local');
  bruno integer := (SELECT "idUsuario" FROM public."Usuario" WHERE "usuEmail"='bruno.demo@biblioteca.local');
  carla integer := (SELECT "idUsuario" FROM public."Usuario" WHERE "usuEmail"='carla.demo@biblioteca.local');
  diego integer := (SELECT "idUsuario" FROM public."Usuario" WHERE "usuEmail"='diego.demo@biblioteca.local');
  elisa integer := (SELECT "idUsuario" FROM public."Usuario" WHERE "usuEmail"='elisa.demo@biblioteca.local');
  fabio integer := (SELECT "idUsuario" FROM public."Usuario" WHERE "usuEmail"='fabio.demo@biblioteca.local');
  gabriela integer := (SELECT "idUsuario" FROM public."Usuario" WHERE "usuEmail"='gabriela.demo@biblioteca.local');
  heitor integer := (SELECT "idUsuario" FROM public."Usuario" WHERE "usuEmail"='heitor.demo@biblioteca.local');
  iara integer := (SELECT "idUsuario" FROM public."Usuario" WHERE "usuEmail"='iara.demo@biblioteca.local');
  marina integer := (SELECT "idUsuario" FROM public."Usuario" WHERE "usuEmail"='marina.demo@biblioteca.local');
  paulo integer := (SELECT "idUsuario" FROM public."Usuario" WHERE "usuEmail"='paulo.demo@biblioteca.local');
  resposta jsonb;
  mov integer;
  exemplar integer;
  outro_exemplar integer;
BEGIN
  -- Três devoluções do mesmo título criam um ranking claro para O Pequeno Príncipe.
  exemplar := (SELECT "idExemplar" FROM public."Exemplar" WHERE "exeLivTombo"='D0001');
  resposta := public.criar_movimentacao(ana,NULL,gestor,'[]'::jsonb,exemplar,true);
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'devolver',gestor);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-100, "movDataEmprestimo"=current_date-100 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataPrevistaDevolucao"=current_date-86, "dataDevolucao"=current_date-92 WHERE "idMovimentacao"=mov;

  resposta := public.criar_movimentacao(bruno,NULL,gestor,'[]'::jsonb,exemplar,true);
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'devolver',gestor);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-75, "movDataEmprestimo"=current_date-75 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataPrevistaDevolucao"=current_date-61, "dataDevolucao"=current_date-64 WHERE "idMovimentacao"=mov;

  resposta := public.criar_movimentacao(carla,NULL,gestor,'[]'::jsonb,exemplar,true);
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'devolver',gestor);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-45, "movDataEmprestimo"=current_date-45 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataPrevistaDevolucao"=current_date-31, "dataDevolucao"=current_date-35 WHERE "idMovimentacao"=mov;

  -- Outros históricos devolvidos alimentam relatórios, recomendações e avaliações.
  exemplar := (SELECT "idExemplar" FROM public."Exemplar" WHERE "exeLivTombo"='D0011');
  resposta := public.criar_movimentacao(ana,NULL,gestor,'[]'::jsonb,exemplar,true);
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'devolver',gestor);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-70, "movDataEmprestimo"=current_date-70 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataPrevistaDevolucao"=current_date-56, "dataDevolucao"=current_date-58 WHERE "idMovimentacao"=mov;

  exemplar := (SELECT "idExemplar" FROM public."Exemplar" WHERE "exeLivTombo"='D0021');
  resposta := public.criar_movimentacao(carla,NULL,gestor,'[]'::jsonb,exemplar,true);
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'devolver',gestor);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-55, "movDataEmprestimo"=current_date-55 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataPrevistaDevolucao"=current_date-41, "dataDevolucao"=current_date-43 WHERE "idMovimentacao"=mov;

  exemplar := (SELECT "idExemplar" FROM public."Exemplar" WHERE "exeLivTombo"='D0091');
  resposta := public.criar_movimentacao(marina,NULL,gestor,'[]'::jsonb,exemplar,true);
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'devolver',gestor);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-30, "movDataEmprestimo"=current_date-30 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataPrevistaDevolucao"=current_date-16, "dataDevolucao"=current_date-20 WHERE "idMovimentacao"=mov;

  -- Empréstimo ativo no prazo.
  exemplar := (SELECT "idExemplar" FROM public."Exemplar" WHERE "exeLivTombo"='D0022');
  resposta := public.criar_movimentacao(ana,NULL,gestor,'[]'::jsonb,exemplar,true);
  mov := (resposta->>'idMovimentacao')::integer;
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-4, "movDataEmprestimo"=current_date-4 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataPrevistaDevolucao"=current_date+10 WHERE "idMovimentacao"=mov;

  -- Empréstimo atrasado.
  exemplar := (SELECT "idExemplar" FROM public."Exemplar" WHERE "exeLivTombo"='D0051');
  resposta := public.criar_movimentacao(bruno,NULL,gestor,'[]'::jsonb,exemplar,true);
  mov := (resposta->>'idMovimentacao')::integer;
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-25, "movDataEmprestimo"=current_date-25 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataPrevistaDevolucao"=current_date-5 WHERE "idMovimentacao"=mov;

  -- Empréstimo ativo para pessoa da comunidade.
  exemplar := (SELECT "idExemplar" FROM public."Exemplar" WHERE "exeLivTombo"='D0081');
  resposta := public.criar_movimentacao(paulo,NULL,gestor,'[]'::jsonb,exemplar,true);
  mov := (resposta->>'idMovimentacao')::integer;
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-2, "movDataEmprestimo"=current_date-2 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataPrevistaDevolucao"=current_date+12 WHERE "idMovimentacao"=mov;

  -- Empréstimo coletivo de aluno com devolução parcial.
  resposta := public.criar_movimentacao(diego,NULL,gestor,jsonb_build_array(
    jsonb_build_object('idLivro',(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='Extraordinário'),'quantidade',1),
    jsonb_build_object('idLivro',(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='Quarto de Despejo'),'quantidade',1)
  ));
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'aprovar',gestor);
  PERFORM public.transicionar_movimentacao(mov,'retirar',gestor);
  exemplar := (SELECT me."idExemplar" FROM public."MovimentacaoExemplar" me
    WHERE me."idMovimentacao"=mov ORDER BY me."idExemplar" LIMIT 1);
  PERFORM public.transicionar_movimentacao(mov,'devolver',gestor,NULL,ARRAY[exemplar]);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-12, "movDataEmprestimo"=current_date-10 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataPrevistaDevolucao"=current_date+4 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataDevolucao"=current_date-1 WHERE "idMovimentacao"=mov AND "idExemplar"=exemplar;

  -- Empréstimo renovado duas vezes.
  exemplar := (SELECT "idExemplar" FROM public."Exemplar" WHERE "exeLivTombo"='D0101');
  resposta := public.criar_movimentacao(iara,NULL,gestor,'[]'::jsonb,exemplar,true);
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'renovar',gestor,NULL,ARRAY[exemplar],current_date+20);
  PERFORM public.transicionar_movimentacao(mov,'renovar',gestor,NULL,ARRAY[exemplar],current_date+35);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-11, "movDataEmprestimo"=current_date-11 WHERE "idMovimentacao"=mov;

  -- Solicitação pendente.
  resposta := public.criar_movimentacao(elisa,NULL,gestor,jsonb_build_array(
    jsonb_build_object('idLivro',(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='O Pequeno Príncipe'),'quantidade',1)
  ));
  mov := (resposta->>'idMovimentacao')::integer;
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-1, data_solicitacao=now()-interval '1 day' WHERE "idMovimentacao"=mov;

  -- Solicitação aprovada aguardando retirada.
  resposta := public.criar_movimentacao(fabio,NULL,gestor,jsonb_build_array(
    jsonb_build_object('idLivro',(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='Dom Casmurro'),'quantidade',1)
  ));
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'aprovar',gestor);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date, data_solicitacao=now()-interval '3 hours' WHERE "idMovimentacao"=mov;

  -- Solicitação negada.
  resposta := public.criar_movimentacao(gabriela,NULL,gestor,jsonb_build_array(
    jsonb_build_object('idLivro',(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='Alice no País das Maravilhas'),'quantidade',1)
  ));
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'rejeitar',gestor);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-8, data_solicitacao=now()-interval '8 days' WHERE "idMovimentacao"=mov;

  -- Solicitação aprovada e expirada.
  resposta := public.criar_movimentacao(heitor,NULL,gestor,jsonb_build_array(
    jsonb_build_object('idLivro',(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='O Hobbit'),'quantidade',1)
  ));
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'aprovar',gestor);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-5, data_solicitacao=now()-interval '5 days', data_confirmacao=now()-interval '72 hours' WHERE "idMovimentacao"=mov;
  PERFORM public.transicionar_movimentacao(mov,'expirar',gestor);

  -- Professor: empréstimo pessoal ativo.
  resposta := public.criar_movimentacao(NULL,professora,NULL,jsonb_build_array(
    jsonb_build_object('idLivro',(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='O Diário de Anne Frank'),'quantidade',1)
  ),p_finalidade=>'PESSOAL');
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'aprovar',gestor);
  PERFORM public.transicionar_movimentacao(mov,'retirar',gestor);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-6, "movDataEmprestimo"=current_date-5 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataPrevistaDevolucao"=current_date+9 WHERE "idMovimentacao"=mov;

  -- Professor: dois títulos para a turma 6º A.
  resposta := public.criar_movimentacao(NULL,professor,NULL,jsonb_build_array(
    jsonb_build_object('idLivro',(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='Manual de Ciências'),'quantidade',1),
    jsonb_build_object('idLivro',(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='Atlas Histórico Escolar'),'quantidade',1)
  ),p_finalidade=>'TURMA',p_turma=>'A',p_serie=>'6º Ano');
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'aprovar',gestor);
  PERFORM public.transicionar_movimentacao(mov,'retirar',gestor);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-3, "movDataEmprestimo"=current_date-2 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataPrevistaDevolucao"=current_date+12 WHERE "idMovimentacao"=mov;

  -- Professor: uso em sala já devolvido para a turma 7º B.
  resposta := public.criar_movimentacao(NULL,professora,NULL,jsonb_build_array(
    jsonb_build_object('idLivro',(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='Capitães da Areia'),'quantidade',1)
  ),p_finalidade=>'TURMA',p_turma=>'B',p_serie=>'7º Ano');
  mov := (resposta->>'idMovimentacao')::integer;
  PERFORM public.transicionar_movimentacao(mov,'aprovar',gestor);
  PERFORM public.transicionar_movimentacao(mov,'retirar',gestor);
  PERFORM public.transicionar_movimentacao(mov,'devolver',gestor);
  UPDATE public."Movimentacao" SET "movDataSolicitacao"=current_date-40, "movDataEmprestimo"=current_date-39 WHERE "idMovimentacao"=mov;
  UPDATE public."MovimentacaoExemplar" SET "dataPrevistaDevolucao"=current_date-25, "dataDevolucao"=current_date-28 WHERE "idMovimentacao"=mov;

  -- Avaliações válidas sobre livros já devolvidos por alunos.
  PERFORM public.avaliar_livro(ana,(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='O Pequeno Príncipe'),5);
  PERFORM public.avaliar_livro(ana,(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='Dom Casmurro'),4);
  PERFORM public.avaliar_livro(bruno,(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='O Pequeno Príncipe'),4);
  PERFORM public.avaliar_livro(carla,(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='O Pequeno Príncipe'),5);
  PERFORM public.avaliar_livro(carla,(SELECT "idLivro" FROM public."Livro" WHERE "livTitulo"='Harry Potter e a Pedra Filosofal'),5);
END $$;

INSERT INTO public."ResultadoAnoLetivo" ("idUsuario", ano, serie, turma, resultado)
SELECT "idUsuario", extract(year FROM current_date)::integer-1,
  CASE "usuNome"
    WHEN 'Ana Souza' THEN '5º Ano'
    WHEN 'Bruno Lima' THEN '5º Ano'
    WHEN 'Carla Mendes' THEN '5º Ano'
    WHEN 'Diego Alves' THEN '6º Ano'
    WHEN 'Elisa Rocha' THEN '6º Ano'
    WHEN 'Fábio Nunes' THEN '6º Ano'
    WHEN 'Gabriela Reis' THEN '7º Ano'
    WHEN 'Heitor Costa' THEN '7º Ano'
    WHEN 'Iara Fernandes' THEN '8º Ano'
  END,
  "usuTurma",
  CASE WHEN "usuNome"='Fábio Nunes' THEN 'Retido' ELSE 'Promovido' END
FROM public."Usuario"
WHERE "usuNome" IN ('Ana Souza','Bruno Lima','Carla Mendes','Diego Alves','Elisa Rocha','Fábio Nunes','Gabriela Reis','Heitor Costa','Iara Fernandes');

-- Evita que o job local tente enviar mensagens de demonstração para endereços fictícios.
UPDATE public."EmailOutbox" SET enviado_em=now()
WHERE "idMovimentacao" IN (
  SELECT "idMovimentacao" FROM public."Movimentacao"
  WHERE "movUsuarioNome" IN ('Ana Souza','Bruno Lima','Carla Mendes','Diego Alves','Elisa Rocha','Fábio Nunes',
    'Gabriela Reis','Heitor Costa','Iara Fernandes','Marina da Silva','Paulo Ribeiro','Professora Helena','Professor Ricardo')
);

DO $$
BEGIN
  IF (SELECT count(*) FROM public."Livro") < 18 THEN RAISE EXCEPTION 'Seed incompleto: livros'; END IF;
  IF (SELECT count(*) FROM public."Exemplar") < 40 THEN RAISE EXCEPTION 'Seed incompleto: exemplares'; END IF;
  IF (SELECT count(*) FROM public."Usuario") < 16 THEN RAISE EXCEPTION 'Seed incompleto: leitores'; END IF;
  IF (SELECT count(*) FROM public."Administrador" WHERE "admProfessor") < 4 THEN RAISE EXCEPTION 'Seed incompleto: professores'; END IF;
  IF (SELECT count(*) FROM public."Movimentacao") < 17 THEN RAISE EXCEPTION 'Seed incompleto: movimentações'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public."MovimentacaoExemplar" WHERE renovacoes=2) THEN RAISE EXCEPTION 'Seed incompleto: renovação'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public."MovimentacaoExemplar" WHERE "itemStatus"='Ativo' AND "dataPrevistaDevolucao"<current_date) THEN RAISE EXCEPTION 'Seed incompleto: atraso'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public."Movimentacao" WHERE "movStatus"='Pendente') THEN RAISE EXCEPTION 'Seed incompleto: solicitação pendente'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public."Movimentacao" WHERE "movStatus"='Aprovado') THEN RAISE EXCEPTION 'Seed incompleto: solicitação aprovada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public."Movimentacao" WHERE "movStatus"='Expirado') THEN RAISE EXCEPTION 'Seed incompleto: solicitação expirada'; END IF;
END $$;

COMMIT;

SELECT
  (SELECT count(*) FROM public."Livro") AS livros,
  (SELECT count(*) FROM public."Exemplar") AS exemplares,
  (SELECT count(*) FROM public."Usuario" WHERE NOT "usuExcluido") AS leitores_visiveis,
  (SELECT count(*) FROM public."Administrador" WHERE "admProfessor") AS professores,
  (SELECT count(*) FROM public."Movimentacao") AS movimentacoes,
  (SELECT count(*) FROM public."AvaliacaoLivro") AS avaliacoes;
