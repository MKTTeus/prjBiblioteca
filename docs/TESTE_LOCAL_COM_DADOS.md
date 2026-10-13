# Teste local com dados de demonstração

Este roteiro recria o Supabase local executado pelo Docker e carrega dados para testar relatórios, catálogo, circulação, perfis, recomendações e fechamento letivo. A massa está em `supabase/seed.sql` e usa somente endereços fictícios terminados em `@biblioteca.local`.

> `supabase db reset --local` apaga os dados do banco local do projeto atual. O comando não deve ser executado com `--linked` nem com uma URL de produção.

## 1. Atualizar e recriar o banco local

Abra o Docker Desktop. No PowerShell, entre na raiz do repositório, onde existe `supabase/config.toml`, e execute:

```powershell
git checkout main
git pull origin main
supabase start
supabase db reset --local
supabase status
```

O reset aplica todas as migrations e depois executa `supabase/seed.sql`. Ao final, a massa deve conter:

| Dado | Quantidade mínima |
| --- | ---: |
| Livros | 18 |
| Exemplares | 40 |
| Leitores cadastrados | 16 |
| Professores | 4 |
| Movimentações | 18 |
| Avaliações | 5 |

Se `supabase start` informar que a pilha já está ativa, prossiga com o reset. Use sempre os endereços mostrados pelo `supabase status`, pois o ambiente criado anteriormente pode usar portas como `55321` e `55322` em vez das portas padrão.

## 2. Apontar a aplicação para o Supabase local

No `.env` da raiz, use a **API URL** e a **service_role key** exibidas por `supabase status`:

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=COLE_A_SERVICE_ROLE_KEY_LOCAL
SECRET_KEY=segredo-local-com-pelo-menos-32-caracteres
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
REACT_APP_API_URL=
```

Não coloque a `service_role key` em uma variável iniciada por `REACT_APP_`. Se o status mostrar outra porta para a API, substitua `54321` pelo valor exibido.

Inicie o backend:

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --app-dir src/backend --reload --port 5000
```

Em outro PowerShell, inicie o frontend:

```powershell
npm start
```

Acesse `http://localhost:3000`. A API deve responder em `http://127.0.0.1:5000/api`.

## 3. Contas para teste

Todas as contas usam a senha **`Teste@123`**.

| Perfil na tela de login | Identificador | O que testar |
| --- | --- | --- |
| Equipe Escolar | `gestor.demo@biblioteca.local` | Dashboard, cadastros, circulação, relatórios, configurações e backup. |
| Equipe Escolar | `helena.demo@biblioteca.local` | Área do professor, empréstimo pessoal e empréstimo para turma. |
| Aluno | `ana.demo@biblioteca.local` ou RA `DEM0001` | Empréstimo atual, histórico, avaliações e recomendações. |
| Aluno | `bruno.demo@biblioteca.local` ou RA `DEM0002` | Empréstimo atrasado e avisos. |
| Comunidade | `paulo.demo@biblioteca.local` ou CPF `11144477735` | Empréstimo ativo de pessoa da comunidade. |

## 4. Conferir os relatórios

Entre como **Gestora Demo**, abra **Relatórios → Consultas e Controle** e teste inicialmente sem período. Depois aplique um intervalo dos últimos 120 dias até hoje.

| Grupo e relatório | Conferência esperada |
| --- | --- |
| Acervo — Circulação dos livros | `O Pequeno Príncipe` aparece entre os mais emprestados; o atalho **Sem empréstimos** mostra títulos nunca retirados. Solicitações ainda não retiradas não aumentam o ranking. |
| Acervo — Inventário por tombo | Mostra 40 exemplares, incluindo reservados, emprestados, `D0141` como **Tombo Fixo**, `D0151` como **Desativado** e `D0161` como **Indisponível**. |
| Acervo — Autores e suas obras | `Autor sem obra` aparece com zero títulos; `Manual de Ciências` está ligado a dois autores. |
| Acervo — Revisão cadastral | `Livro com Cadastro Incompleto` aparece com vários campos ausentes e sem exemplares. |
| Leitores — Alunos, professores e comunidade | Há leitores com empréstimos, sem empréstimos, ativos, inativos e formados. O filtro **Professor** mostra as contas de professores. |
| Leitores — Leitura por turma e série | A turma **6º Ano A** tem alunos e uso em sala pelo Professor Ricardo; **7º Ano B** possui uso em sala já devolvido. |
| Circulação — Quem pegou qual livro | Mostra alunos, comunidade e professores. Pesquise `Ana Souza`, `Professor Ricardo`, `D0051` ou `O Hobbit`. |
| Circulação — Devoluções no período | Há devoluções totais e uma devolução parcial de Diego Alves. Use os últimos 120 dias. |
| Circulação — Empréstimos renovados | Iara Fernandes aparece com o tombo `D0101` e duas renovações. |
| Circulação — Solicitações e retiradas | Elisa Rocha está pendente, Fábio Nunes aprovado, Gabriela Reis negada e Heitor Costa expirado. Também aparecem retiradas originadas de solicitação. |

Em cada relatório, faça ainda estas verificações:

1. Altere um filtro e confirme que as exportações ficam desabilitadas até clicar em **Consultar**.
2. Abra **Filtros adicionais**, selecione opções e recolha a seção; os valores devem permanecer aplicados.
3. Troque entre Acervo, Leitores e Circulação; a última consulta escolhida em cada grupo deve ser preservada.
4. Gere **Excel completo** e **PDF completo** e compare o total exportado com o total mostrado no resumo.
5. Reduza a janela do navegador e confira filtros, tabela com rolagem horizontal e primeira coluna fixa.

## 5. Conferir as demais funcionalidades

### Dashboard e acervo

- O dashboard deve apresentar livros, exemplares, empréstimos ativos e atrasos coerentes com a massa.
- No acervo, pesquise por título, ISBN e tombo.
- Confira títulos sem exemplar, obra desativada, exemplar em conservação e exemplar de consulta local.
- Cadastre um novo livro com dois exemplares, edite um deles e verifique a numeração de tombos.

### Empréstimos e solicitações

- Em **Empréstimos e Devoluções**, localize Bruno Lima e confirme o atraso.
- Localize Diego Alves: um exemplar está devolvido e o outro permanece ativo.
- Localize Iara Fernandes e confira o contador de duas renovações.
- Em **Solicitações**, aprove ou negue um novo pedido; depois registre a retirada de uma solicitação aprovada.
- Faça uma devolução parcial de um empréstimo com mais de um exemplar e confira novamente os relatórios.

### Aluno, comunidade e professor

- Como Ana Souza, confira histórico, empréstimo atual, recomendações e as avaliações existentes.
- Como Paulo Ribeiro, confira o empréstimo ativo da comunidade.
- Como Professora Helena, confira um empréstimo pessoal ativo e outro para a turma 7º Ano B já devolvido.
- Como Professor Ricardo, confira os dois títulos retirados para a turma 6º Ano A.

### Cadastros, configurações e backup

- Filtre alunos por série e turma; confira também aluno inativo e aluno formado.
- Confira professor ativo e inativo no cadastro da equipe.
- Exporte um backup completo no ambiente local e valide a tela de configurações.
- Não use endereços reais: as mensagens geradas pelo seed já são marcadas como processadas para evitar tentativas de envio.

## 6. Restaurar a massa inicial

Depois de alterar os dados durante os testes, volte ao estado conhecido executando novamente:

```powershell
supabase db reset --local
```

Reinicie o backend caso tenha alterado a URL ou a chave do Supabase no `.env`.

Para validar migrations, constraints, fluxos transacionais e o próprio seed em um banco temporário, execute:

```powershell
npm run test:db
```

## Diagnóstico rápido

- **A aplicação mostra dados de produção:** pare o backend, corrija `SUPABASE_URL` e `SUPABASE_KEY` no `.env` e inicie-o novamente.
- **Erro de conexão recusada:** abra o Docker Desktop e execute `supabase start` na raiz correta.
- **Relatórios retornam 401:** entre novamente como `gestor.demo@biblioteca.local`.
- **Relatórios estão vazios:** confirme que o reset exibiu a etapa de seed e abra o Studio indicado por `supabase status` para verificar as tabelas.
- **Porta diferente:** use os valores do `supabase status`; não presuma que o ambiente antigo usa as portas padrão.
