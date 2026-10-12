# Novi: assistente de orientação para gestores

A Novi aparece no canto inferior direito de todas as telas administrativas. Ela orienta o gestor sobre a Sala de Leitura, mostra indicadores permitidos e oferece atalhos para páginas de gestão. A janela mantém a conversa somente enquanto o layout do gestor está montado; o botão **Limpar** descarta o histórico visível. As respostas usam negrito e listas renderizados como elementos de texto, sem interpretar HTML ou links do modelo.

## Escopo e proteção

- O endpoint `POST /api/novi/perguntar` exige uma sessão válida de gestor por `get_admin`. Professor e demais perfis não têm acesso, mesmo chamando a API diretamente.
- O chat executa apenas as consultas de leitura permitidas em `src/backend/novi_data.py`: nome da própria conta, campos bibliográficos mínimos de até cinco títulos, títulos sem nenhum exemplar, totais de alunos não excluídos ou ativos não formados, professores ativos, títulos e exemplares, e três contagens agregadas da circulação. Consultas usam colunas e filtros fixos; nenhum SQL, nome de tabela, campo ou URL pode ser escolhido pelo modelo ou pelo usuário. Resultados brutos e dados pessoais de terceiros não são enviados ao modelo. O chat não executa mutações. Links saem de uma lista fechada de rotas administrativas.
- A pergunta tem até 800 caracteres; o histórico, até seis mensagens. Há limite de 20 requisições por gestor a cada cinco minutos. Não são persistidas transcrições pelo recurso.
- Não envie dados pessoais ou credenciais. A API recusa perguntas com formatos conhecidos de CPF, e-mail e token, e remove esses formatos do contexto antes de chamar o modelo. Reconhecimento automático de dados sensíveis não cobre todas as formas de identificação: o chat não substitui as telas autorizadas para tratar casos individuais. O nome próprio é buscado pelo ID da sessão autenticada, nunca por um ID informado no texto.
- A resposta do modelo é tratada como conteúdo não confiável. O backend valida estado e conteúdo, substitui uma resposta insegura por uma orientação conservadora e nunca aceita um endereço de navegação gerado pelo modelo.

## Fontes e resposta

Cada mensagem passa primeiro pelo modelo, que produz um plano estruturado: consulta permitida, orientação, conversa, pedido de esclarecimento, recusa ou assunto fora do escopo. A decisão considera o histórico recente do gestor, inclusive perguntas compostas, continuação e correção; não há respostas selecionadas por expressões fixas para esses casos. O servidor valida a decisão antes de executar uma consulta ou oferecer um destino. Filtros não implementados nas consultas do chat devem ser encaminhados à tela, sem devolver um total geral como se respondesse ao recorte.

Consultas factuais usam dados atuais no servidor, sem passar o resultado bruto ao modelo. Para orientação, o modelo propõe uma busca autossuficiente e recebe trechos relevantes de `NOVI_FLUXOS_GESTOR.md`, `GUIA_DE_USO.md`, `REGRAS_E_FLUXOS.md` e `ARQUITETURA.md`. Quando os documentos não bastam, recebe somente funções selecionadas no índice `src/backend/novi_knowledge.py` do mesmo deploy. Não há ferramenta de leitura livre de arquivos, acesso ao GitHub ou a segredos. A resposta indica apenas documentos consultados; o código serve para entender a regra, sem ser exibido no chat.

Se não houver fonte suficiente sobre uma função específica, a Novi declara o limite e encaminha o gestor à tela relacionada ou à equipe técnica. Para perguntas fora do projeto, indica seu escopo sem responder o outro assunto. Uma indisponibilidade do modelo nunca transforma uma pergunta sobre dados atuais em um trecho genérico do guia. Os totais consultados são retratos do momento e devem ser conferidos novamente na aplicação antes de qualquer decisão. Prazos e status individuais continuam nas telas normais. Alterações nos fluxos exigem revisão dos guias, do índice de código e das rotas permitidas antes de publicar um novo deploy.

## Configuração e verificação

Configure `GEMINI_API_KEY` **somente no backend** no ambiente local e na função Python do deploy. `NOVI_GEMINI_MODEL` é opcional e usa `gemini-2.5-flash` por padrão. Para o modelo padrão, desabilitamos o orçamento de pensamento para preservar o espaço da resposta estruturada. Sem a chave ou em falha do provedor, o endpoint responde 503: a Novi não pode interpretar a pergunta nem selecionar uma consulta. A interface informa a indisponibilidade. Não use o prefixo `REACT_APP_` para essas variáveis.

```bash
python -m pytest -q src/backend/tests/test_novi.py src/backend/tests/test_novi_data.py
npm test -- --runInBand src/components/NoviChat/NoviChat.test.jsx
npm run build
```

Antes de habilitar em produção, teste com uma conta de gestor e confirme respostas, links, visual em telas pequenas, recusa de uma conta de professor e bloqueio de dados pessoais. A chamada real ao Gemini depende de chave e rede do ambiente de implantação; os testes automatizados simulam o provedor.
