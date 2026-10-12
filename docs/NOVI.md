# Novi: assistente de orientação para gestores

A Novi aparece no canto inferior direito de todas as telas administrativas. Ela responde perguntas sobre os fluxos da biblioteca e oferece atalhos para páginas de gestão. A janela mantém a conversa somente enquanto o layout do gestor está montado; o botão **Limpar** descarta o histórico visível.

## Escopo e proteção

- O endpoint `POST /api/novi/perguntar` exige uma sessão válida de gestor por `get_admin`. Professor e demais perfis não têm acesso, mesmo chamando a API diretamente.
- O chat não lê registros do banco, não consulta configurações vigentes e não executa operações. Links saem de uma lista fechada de rotas administrativas, e cada página conserva suas próprias verificações de acesso.
- A pergunta tem até 800 caracteres; o histórico, até seis mensagens. Há limite de 20 requisições por gestor a cada cinco minutos. Não são persistidas transcrições pelo recurso.
- Não envie dados pessoais ou credenciais. A API recusa perguntas com formatos conhecidos de CPF, e-mail e token, e remove esses formatos do contexto antes de chamar o modelo. Reconhecimento automático de dados sensíveis não cobre todas as formas de identificação: o chat não substitui as telas autorizadas para tratar casos individuais.
- A resposta do modelo é tratada como conteúdo não confiável. O backend valida estado e conteúdo, substitui uma resposta insegura por uma orientação conservadora e nunca aceita um endereço de navegação gerado pelo modelo.

## Fontes e resposta

O backend recupera trechos de `NOVI_FLUXOS_GESTOR.md`, `GUIA_DE_USO.md`, `REGRAS_E_FLUXOS.md` e `ARQUITETURA.md`. Perguntas curtas de continuação reaproveitam o assunto recente do gestor para buscar a fonte certa. Quando os documentos não bastam, a IA recebe somente funções selecionadas no índice `src/backend/novi_knowledge.py` do mesmo deploy. Não há ferramenta de leitura livre de arquivos, acesso ao GitHub ou a segredos. A resposta indica apenas documentos consultados; o código serve para entender a regra, sem ser exibido no chat.

Se não houver fonte suficiente, a Novi declara o limite e encaminha o gestor à tela relacionada ou à equipe técnica. Prazos, disponibilidade, status e totais atuais devem ser conferidos na aplicação. Alterações nos fluxos exigem revisão dos guias, do índice de código e das rotas permitidas antes de publicar um novo deploy.

## Configuração e verificação

Configure `GEMINI_API_KEY` **somente no backend** no ambiente local e na função Python do deploy. `NOVI_GEMINI_MODEL` é opcional e usa `gemini-2.5-flash` por padrão. Sem a chave, o endpoint responde 503 e a interface mostra uma mensagem breve. Não use o prefixo `REACT_APP_` para essas variáveis.

```bash
python -m pytest -q src/backend/tests/test_novi.py
npm test -- --runInBand src/components/NoviChat/NoviChat.test.jsx
npm run build
```

Antes de habilitar em produção, teste com uma conta de gestor e confirme respostas, links, visual em telas pequenas, recusa de uma conta de professor e bloqueio de dados pessoais. A chamada real ao Gemini depende de chave e rede do ambiente de implantação; os testes automatizados simulam o provedor.
