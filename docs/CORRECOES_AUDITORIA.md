# Correções da auditoria

Base: `aea9eb17f2fe68469136d6d92e2c1bae1cf8b498`. Branch de trabalho: `fix/auditoria-biblioteca`.

As correções abaixo estão implementadas no repositório. A aplicação no Supabase e a implantação do backend/frontend precisam seguir [APLICACAO_MIGRATIONS.md](APLICACAO_MIGRATIONS.md). Nenhuma alteração no banco de produção foi feita durante este trabalho.

| Item | Pendência | Correção implementada |
|---|---|---|
| 1 | RPCs administrativas acessíveis anonimamente | Revogação de PUBLIC/anon/authenticated, acesso service_role; tabelas com RLS e Storage protegido por policies restritivas. |
| 2 | Login com versão incorreta | Consulta e emissão da versão real e do epoch de sessão. |
| 3 | Gestor não lista empréstimos | Dependência aceita gestor e usuário comum; proprietário filtrado na consulta para usuários. |
| 4 | Operações atingem só a primeira cópia | Aprovar, negar, retirar e expirar atingem todas; devolução identifica cópias por ID. |
| 5 | Repetição de devolução libera outro empréstimo | Repetição só considera itens ainda ativos na movimentação original; não toca cópias já devolvidas. |
| 6 | Expiração altera empréstimo real | Exige solicitação aprovada, confirmação e prazo vencido; UI acompanha essa regra. |
| 7 | Concorrência e escrita parcial | RPCs transacionais com locks e índice único de circulação vigente; rollback de toda a operação. |
| 8 | Autorização permissiva/cache local | Revalidação de existência, status, exclusão, perfil, versão e epoch; falha de banco retorna 503. |
| 9 | Conta excluída continua acessando | Login e dependências bloqueiam excluídos; concluinte pode consultar/devolver histórico, mas não solicitar como aluno formado. |
| 10 | Troca da própria senha mantém JWT antigo | Backend emite novo token; frontend instala e atualiza o contexto. |
| 11 | Primeiro acesso/senha fraca/padrão compartilhado | Senha provisória restringe o backend; política aplicada a todas as senhas; importação gera segredo aleatório individual e orienta recuperação por e-mail. |
| 12 | Restore perde campos ou recupera sessões | Inserção tipada de todas as colunas, rejeição de schema incompatível, ressincronização de identities, novo epoch e invalidação dos resets. |
| 13 | Backup parcial/inconsistente | Snapshot único bloqueia escritas nas tabelas; valida todas as linhas, contagens, hash e imagens; UUID no nome e paginação no Storage. |
| 14 | Migrations inválidas/duplicadas | Baseline ordenado com nomes entre aspas, campos faltantes e timestamps únicos; histórico antigo arquivado sem apagá-lo. |
| 15 | Expiração sem agendamento/avisos duplicados | Workflow periódico autenticado; outbox com chave única, leases, retry e chave de idempotência do provedor. O cliente reutiliza a chave depois de falha de rede/5xx. Expiração independe do envio. |
| 16 | Ano letivo sem retenção/atomicidade | Retidos selecionáveis, resultado acadêmico por aluno/ano e fechamento único em transação. |
| 17 | Resultados truncados | Paginação ordenada, lotes de IDs e contagem no banco; teste com 255 registros. |
| 18 | Relatório só da primeira cópia | Uma linha por cópia, incluindo professores, snapshots históricos e correção dos contadores/rankings. |
| 19 | Exclusão de livro com ficha deixa estado parcial | Exclusão transacional inclui ficha e vínculos; histórico impede exclusão definitiva. |
| 20 | Tombos/catálogo inconsistentes | Contador serializado considera sufixo numérico além de T9999; livro, vínculos e cópias juntos; ISBN preservado e limpeza explícita de relações. Mesclagens também transacionais. |
| 21 | Rotas contornam livro inativo/limite | Elegibilidade central no SQL para usuário, professor e empréstimo direto; limite conta todas as cópias pendentes/aprovadas/ativas. |
| 22 | Renovação altera itens indevidos | Exige cópias ativas escolhidas, extensão do prazo e limite individual de renovações. |
| 23 | HTML executável na ficha/impressão | React exibe texto; impressão e HTML gerado escapam os valores. |
| 24 | SSRF/arquivos falsos de capa | DNS público validado a cada redirect, conexão no IP validado com Host/SNI, streaming limitado e validação/reencodificação por Pillow. |
| 25 | Recuperação/tentativas inseguras | FRONTEND_URL confiável, conta identificada por tipo/ID, consumo atômico único e limites compartilhados também na identidade canônica. |
| 26 | Hashes/configuração/erros/observabilidade | Allowlist de respostas, configurações tipadas e sem segredos, 403 para senha incorreta no restore, autenticação opcional real, sessão restaurada validada no servidor e logs com request ID sem query/credenciais. |

Também foram substituídos Create React App por Vite e SheetJS por ExcelJS, atualizado jsPDF/React Router, removidas dependências sem uso e fixadas as versões Python. A configuração Vercel passou a servir `dist`. O build expõe apenas as duas variáveis públicas `REACT_APP_*` explicitamente declaradas no Vite; os segredos do backend não são injetados no bundle.

## Validação

- Testes Python: autenticação, falha fechada, política de senha, paginação, respostas públicas, backup, proxy de imagens, escape e relatório por cópia.
- Testes frontend: escape, data de São Paulo, estado da cópia, IDs na devolução e instalação do novo token.
- Teste SQL: PostgreSQL embarcado (PGlite), com todas as migrations, permissões, Storage simulado, circulação coletiva/parcial, repetição, expiração, livro inativo, renovação seletiva, rollback, catálogo, backup e fechamento acadêmico.
- Build de produção: Vite.
- `npm audit`: sem vulnerabilidades conhecidas no conjunto final instalado, na data da validação. Isso não prova ausência de falhas futuras; as exceções transitivas de versão devem ser revistas nas atualizações.
- CI adicionada: repete os testes e executa uma disputa simultânea da mesma cópia em PostgreSQL 16 descartável. A execução remota da CI depende de publicar a branch; esse teste não equivale a uma validação já realizada no Supabase de produção.

## Limites e decisões explícitas

- Sessões passam a exigir o novo epoch; sessões anteriores precisarão de novo login.
- Importados devem definir a senha por recuperação. É necessário um provedor de e-mail configurado e remetente validado.
- Registros antigos não contêm matrícula histórica exata. A migration fixa o melhor metadado disponível e marca `movSnapshotEstimado=true`; novas movimentações guardam o contexto no momento da criação. Retenção passada não pode ser inferida automaticamente.
- Backup v1/v2 não é restaurado automaticamente pelo fluxo novo: contém campos/tabelas incompletos. Preserve os arquivos e ensaie uma conversão explícita em banco separado, comparando as colunas, antes de qualquer recuperação histórica.
- O backup captura capas do bucket `capas`. URLs externas continuam referências externas; o conteúdo desses terceiros não é uma garantia de recuperação. Novos objetos restaurados não sobrescrevem capas em uso; falhas podem deixar objetos órfãos para limpeza posterior.
- Limites do backup: 100 MB descompactado, 8 MB por capa e bucket de 50 MB por objeto. Bases maiores precisam de backup nativo PostgreSQL/Storage e ajuste de capacidade, em vez de aumentar os limites sem teste.
- Emails têm retry e proteção contra workers simultâneos. A janela de idempotência do provedor ainda limita a garantia contra duplicação após falhas muito longas; não é uma promessa de entrega exatamente uma vez.
- O agendador de 30 minutos pode atrasar; a retirada fora do prazo é bloqueada no banco mesmo antes do job. Observe `adiados` e o backlog da outbox.
- 2FA, SMS, debug detalhado e manutenção estão identificados como indisponíveis, sem toggles que prometem um efeito inexistente. Backup automático oferecido na UI é diário; SMTP não é oferecido porque o envio usa o provedor efetivamente configurado.
