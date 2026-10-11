# Resolução das pendências da auditoria — 11/10/2026

Branch: `fix/pendencias-auditoria-20261011`. Referência: auditoria da `main` em `c2ff230bc60c27c8d2751d923e388d8e7d73ec46`.

| Item | Estado | Implementação / verificação |
|---|---|---|
| CI com enum legado | Corrigido na branch | O teste converte os tipos após o baseline e antes da view dependente. A primeira execução da CI passou em `41adfd7`; acompanhar a execução do commit final. |
| Circulação de 30 minutos | Depende de configuração | O workflow GitHub continua exigindo `CRON_API_URL` e `CRON_SECRET` nos secrets. A conexão disponível não administra secrets. O Vercel executa `/api/cron/circulacao` diariamente em vez de repetir duas chamadas equivalentes; isso é uma contingência diária, não substitui a frequência de 30 minutos. |
| Histórico de migrations divergente | Corrigido na branch | Arquivos renomeados para `20261011194555_recomendacoes_alunos.sql` e `20261011195541_otimiza_catalogo_dashboard.sql`, que correspondem ao histórico remoto. O SQL não mudou; não foi usado `migration repair`. |
| Catálogo inativo público | Corrigido na branch | `/livros` ignora `incluir_inativos`; detalhes de título inativo ou sem cópia ativa retornam 404. `/livros/gestao/{idLivro}` exige gestor, preservando a edição. Há teste de regressão para os dois caminhos. |
| Indicadores internos públicos | Corrigido na branch | `/dashboard-stats` exige gestor. Há teste de autenticação. |
| Total de livros divergente | Corrigido na branch | O painel usa `resumo_acervo()` para `totalLivros`, igual ao catálogo público, incluindo somente títulos ativos com exemplar ativo. |
| Seed local ausente | Corrigido na branch | `db.seed` desativado e lista de arquivos vazia. O projeto não inclui dados fictícios automáticos. |
| Recomendações com leitura global | Acompanhar capacidade | Cada painel ainda consulta o catálogo e o histórico global. Com cerca de 334 títulos e uma movimentação, não há evidência de gargalo atual. Antes de ampliar a base, medir duração e volume das respostas e então limitar candidatos no SQL ou introduzir snapshot/cache com invalidação de avaliações e empréstimos. |
| FKs sem índices | Preparado na branch | Nova migration com quatro índices: outbox→movimentação, movimentação→admin/professor e usuário→admin. Aplicar ao banco somente após validar a branch e registrar a versão no histórico. Índices antigos com uso baixo não foram removidos sem dados de carga. |

## Passos operacionais restantes

1. Confirmar a CI completa no último commit e revisar/mesclar o PR.
2. Configurar no GitHub os secrets `CRON_API_URL` (origem HTTPS sem `/api`) e `CRON_SECRET` (mesmo valor do backend). Acionar manualmente `circulacao.yml` e verificar resposta 2xx e processamento de prazos/outbox.
3. Aplicar `20261011223000_indices_fks.sql` pelo processo de migrations após validação e conferir que aparece no histórico remoto. Os nomes das duas migrations anteriores já foram reconciliados; não reaplicá-las.
4. Depois do deploy, conferir anon/gestor nos endpoints corrigidos e comparar `totalLivros` com `/livros/resumo`.

A frequência efetiva do GitHub Actions pode variar; o agendador diário da Vercel também depende do deploy e de `CRON_SECRET` configurado no ambiente. Não considere a circulação de 30 minutos restabelecida até o teste manual do workflow passar.
