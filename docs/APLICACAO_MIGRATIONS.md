# Aplicação das correções no ambiente real

A aplicação foi alterada para depender das novas RPCs e colunas. Banco e versão da aplicação precisam ser implantados de forma coordenada.

## Estado da implantação em 10/10/2026

As oito migrations foram aplicadas pelo plugin Supabase ao projeto `xjwodxotibpbxsmalkck` (`prjBiblioteca`), após confirmação dos backups e pré-verificação sem os conflitos conhecidos. Os arquivos receberam os timestamps registrados pelo Supabase, de `20261010230214` a `20261010230420`. Não reaplique essas migrations nesse projeto nem use `migration repair` para versões antigas.

O ensaio local reproduziu a estrutura real do banco com dados fictícios, incluindo enums, constraints e campos legados. Ele encontrou e corrigiu a conversão de `usuTipo` para texto no snapshot da circulação. As configurações legadas de SMTP foram preservadas. Não foi feita uma restauração dos dados reais em homologação nem uma alteração das variáveis da Vercel.

Após a aplicação, as contagens permaneceram: 334 livros, 1.960 exemplares, 2 usuários, 11 administradores e 1 movimentação. Todas as 22 tabelas de negócio têm RLS; nenhuma permite leitura/escrita por `anon`. As 16 RPCs de negócio verificadas permitem `service_role`; nenhuma função privilegiada em `public` permite `anon`/`authenticated`. Os buckets e quatro policies restritivas de Storage foram conferidos. O cache de schema da API foi recarregado.

O advisor não apontou erros de segurança. As informações de RLS sem policies são esperadas neste modelo de acesso exclusivo pelo backend. Permanece um aviso anterior sobre `pg_trgm` em `public`: [orientação do Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public). A extensão não foi movida nesta implantação.

Próximo passo: aguardar a CI do PR atualizado, conferir as variáveis do servidor listadas abaixo e mesclar o PR para implantar a aplicação. Depois, testar login, catálogo e circulação no ambiente real.

## Preparação e ensaio

1. Obtenha um backup nativo do PostgreSQL e uma cópia do Storage antes de modificar schema/grants. O backup antigo da aplicação sozinho não é suficiente para esse ponto de recuperação.
2. Restaure uma cópia em homologação. Confira nomes de tabelas/colunas, enums, FKs, triggers e o histórico `supabase_migrations.schema_migrations` real. Os SQL antigos não representam fielmente todos os ambientes.
3. Instale `requirements-dev.txt`, forneça `DATABASE_URL` de homologação e execute `python scripts/preflight-db.py`. O script é somente leitura; aponta emails ambíguos, duas circulações vigentes da mesma cópia e status físicos incompatíveis. Corrija conflitos com conferência do histórico. Não exclua empréstimos para fazer o índice passar.
4. Aplique os arquivos de `supabase/migrations` por ordem de timestamp, em homologação, com uma conta que possa criar funções/policies. `legacy_migrations` é arquivo histórico, não parte do novo processo de instalação.
5. Ensaiar: login de cada perfil, senha provisória, recuperação, solicitação coletiva, retirada, devolução parcial/repetida, renovação de uma cópia, catálogo, backup v3/restauração e encerramento com retidos. Execute os testes locais também.

As versões antigas tinham prefixos repetidos e schema inconsistente. **Não execute `migration repair`, não apague o histórico remoto e não marque todas as versões como aplicadas automaticamente.** Reconciliar o histórico depende do inventário daquele banco. Pode-se aplicar os novos SQL pelo editor SQL/psql em homologação e registrar os timestamps pelo procedimento adotado pela equipe, preservando o histórico anterior. Uma instalação vazia deve usar somente os novos arquivos.

Cada arquivo deve ser aplicado em transação (exemplo: `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f arquivo.sql`). As funções já delimitam cada operação de negócio em uma transação. O baseline é não destrutivo, mas índices/constraints recusam novos dados inválidos; privilégios e policies de Storage passam a ser restritos.

## Produção

Após o ensaio e revisão, interrompa novas escritas durante a mudança coordenada, faça o backup de recuperação, aplique os SQL e implante a aplicação. Não use o toggle antigo de manutenção para isso: ele está indisponível. Planeje a janela pela infraestrutura de deploy.

Configure no servidor:

- `SUPABASE_KEY`: service_role, nunca anon e nunca variável pública do frontend.
- `SECRET_KEY`: segredo forte exclusivo para JWT.
- `FRONTEND_URL`: domínio HTTPS real, sem hash, query ou path. `http://localhost:3000` é apenas local.
- `CORS_ORIGINS`: domínios concretos da aplicação. Regex de preview somente para o próprio projeto, se necessária.
- `RESEND_API_KEY` e `RESEND_FROM_EMAIL`: credencial e remetente autorizado pelo provedor.
- `CRON_SECRET`: segredo distinto para as chamadas automáticas.

A migration de Storage garante `backups` privado, `capas` público e bloqueia leitura/escrita de backups e escrita de capas por anon/authenticated, mesmo com uma policy permissiva antiga. Verifique no projeto real os endpoints de arquivos, URLs assinadas, API roles e policies após aplicar. A service_role pertence somente ao backend.

Para o job de circulação, configure nos secrets do GitHub:

- `CRON_API_URL`: origem da aplicação, por exemplo `https://seu-dominio`, sem `/api` no fim.
- `CRON_SECRET`: mesmo segredo do backend.

O workflow `circulacao.yml` chama `/api/cron/circulacao` a cada 30 minutos e também permite disparo manual. O agendamento só ocorre após o workflow estar na branch padrão; pode haver atrasos ou suspensão por inatividade. Os jobs diários existentes permanecem no Vercel e usam `Authorization: Bearer CRON_SECRET`. Confira a disponibilidade/limites do agendador do seu plano.

Depois do deploy, gere um backup v3, baixe-o autenticado e valide uma restauração em homologação. Em produção, usuários precisam entrar novamente após restauração porque o epoch muda. O fechamento acadêmico altera apenas os alunos elegíveis e registra retidos/promovidos/formados; empréstimos anteriores preservam seus snapshots.

## Recuperação da implantação

Se um SQL falhar, a transação desse arquivo deve reverter e a aplicação nova não deve ser liberada. Se a versão nova apresentar incompatibilidade, mantenha as escritas interrompidas, volte o deploy e utilize o backup nativo/homologação para definir a recuperação do schema. Não execute os SQL históricos como reversão: eles não são migrations de downgrade e podem perder dados.
