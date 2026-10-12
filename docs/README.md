# Documentação do prjBiblioteca

Esta documentação descreve o código da `main` após o PR #16 (referência: `f324048`, 11/10/2026). Em caso de divergência, confira a implementação e atualize o documento no mesmo PR da mudança. Os dados de empréstimos, disponibilidade e prazos de uma pessoa são dinâmicos e devem vir da API autenticada.

| Documento | Público e finalidade |
|---|---|
| [Arquitetura](ARQUITETURA.md) | Desenvolvedores: componentes, limites de confiança, banco e pontos de extensão. |
| [Regras e fluxos](REGRAS_E_FLUXOS.md) | Equipe e desenvolvedores: circulação, perfis, catálogo, recomendações e fechamento letivo. |
| [Guia de uso](GUIA_DE_USO.md) | Alunos, comunidade, professores e gestores: tarefas e dúvidas frequentes. Base inicial de conteúdo público do futuro chatbot. |
| [Novi](NOVI.md) | Gestores e desenvolvedores: limites, fontes, configuração e validação do assistente. |
| [Fluxos da Novi](NOVI_FLUXOS_GESTOR.md) | Gestores: passos conferidos nas telas para dúvidas de uso. |
| [Migrations](APLICACAO_MIGRATIONS.md) | Implantação coordenada e histórico de migração. |
| [Auditoria anterior](CORRECOES_AUDITORIA.md) e [resolução de 11/10](RESOLUCAO_AUDITORIA_20261011.md) | Registros históricos; não substituem o estado atual nem o guia de operação. |

## Manutenção

- Alterou tela ou mensagem? Revise `GUIA_DE_USO.md` e os exemplos do chatbot.
- Alterou autorização, endpoint, configuração ou regra de negócio? Revise `REGRAS_E_FLUXOS.md` e `ARQUITETURA.md`.
- Alterou migration, agendamento, secret ou processo de recuperação? Revise `APLICACAO_MIGRATIONS.md`.
- Para a Novi, revise as fontes públicas e o índice permitido descritos em `NOVI.md`. Informações de conta, prazo e disponibilidade atuais continuam nas telas autenticadas. Não ingira automaticamente documentos de operação ou dados exportados do banco.
