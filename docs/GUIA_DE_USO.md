# Guia de uso da biblioteca

Este guia descreve as funções disponíveis no sistema em 11/10/2026. Prazos, disponibilidade e dados da sua conta podem mudar: consulte a tela atualizada ou peça confirmação à equipe da biblioteca. Os nomes dos menus podem variar um pouco entre versões.

## Entrar e recuperar acesso

1. Abra o sistema e escolha o perfil indicado na tela de login. Informe seu identificador e sua senha: aluno usa e-mail ou RA; comunidade usa e-mail ou CPF. Professor entra pela modalidade administrativa.
2. Se recebeu uma senha provisória, conclua “Primeiro acesso” antes de solicitar livros.
3. Se esqueceu a senha, use “Esqueci minha senha” e siga o link enviado ao e-mail cadastrado. Se não tiver acesso a esse endereço, procure a equipe da biblioteca. Nunca envie sua senha ou o link de redefinição a outra pessoa.

## Alunos e comunidade

- **Encontrar livros:** abra “Biblioteca”, busque o título e confira o detalhe e a disponibilidade exibidos. A presença de um título no acervo não significa que exista uma cópia disponível naquele instante.
- **Pedir um livro:** use a opção de solicitar no título desejado. A mensagem de envio indica que a solicitação entrou na fila; aguarde a aprovação da equipe. Não compareça para retirada até ver a confirmação e as orientações na tela.
- **Acompanhar:** consulte “Meus empréstimos” para solicitações pendentes, livros ativos, atrasos e prazos. Após aprovação, a equipe registra a retirada. Uma solicitação aprovada tem prazo para retirada e pode expirar.
- **Devolver ou renovar:** entregue o exemplar à biblioteca. A equipe registra a devolução e faz a renovação quando permitida. Verifique depois o novo prazo ou o status na sua área.
- **Recomendações e notas (alunos):** o aluno pode ver sugestões e avaliar de 1 a 5 um livro que já devolveu. A área de comunidade não tem essa função no código atual.
- **Dados pessoais:** confira e atualize os campos editáveis em “Configurações”. Para mudanças cadastrais que não apareçam ali, procure a equipe.

## Professores

1. Na área do professor, abra “Novo empréstimo” e escolha “Para mim” ou “Para uma turma”. Para uma turma, identifique a turma.
2. Selecione os títulos e as quantidades. Envie a solicitação e acompanhe “Meus empréstimos”. A equipe aprova a solicitação e registra a retirada.
3. Para devolver, abra o empréstimo, marque os tombos devolvidos e confirme. É possível registrar parte das cópias; as demais continuam em aberto.

## Gestores da biblioteca

- **Acervo:** cadastre e edite títulos, cópias e tombos; gerencie autores, gêneros, categorias, capas e fichas catalográficas. Um título inativo fica fora do catálogo público, mas segue acessível na gestão.
- **Circulação:** examine solicitações pendentes; aprove ou rejeite; na entrega física, registre a retirada. Registre devoluções por exemplar e renovações com novo prazo. Confira a solicitação antes de repetir uma ação após falha de rede.
- **Pessoas:** cadastre alunos, comunidade, administradores e professores, importe listas e gerencie status. Trate dados pessoais somente na área autenticada.
- **Relatórios e configuração:** use as telas de relatórios para empréstimos, atrasos e acervo. Ajuste prazos e limites nas configurações; confirme o valor salvo antes de comunicá-lo aos leitores.
- **Ano letivo e backup:** confira os alunos retidos antes de encerrar o ano. Faça backup e ensaie restauração em homologação conforme o guia interno de operação; restauração não deve ser usada como solução rotineira para corrigir um cadastro.

## Dúvidas frequentes

| Pergunta | Resposta segura |
|---|---|
| “Solicitei um livro. Já posso retirar?” | Veja o status em “Meus empréstimos”. A solicitação precisa de aprovação; a retirada precisa ser registrada pela equipe. |
| “Por quanto tempo posso ficar com o livro?” | O padrão no código é 14 dias após a retirada, mas a configuração e o prazo da sua cópia podem ser diferentes. Consulte “Meus empréstimos”. |
| “Posso pedir vários livros?” | Há um limite configurável para cópias em curso (padrão 3 para contas de usuário); a disponibilidade é conferida na hora da solicitação. |
| “Por que não consigo avaliar um livro?” | A nota do aluno só é liberada depois que a devolução do livro é registrada. |
| “Não recebi um e-mail.” | Confira spam e o endereço cadastrado; consulte o status na aplicação. Se persistir, informe à equipe o horário, a ação e, se houver, o código de erro. Não compartilhe token nem senha. |
| “A página está lenta ou apresentou erro 503.” | Tente atualizar uma vez e consulte novamente o estado da operação. Se persistir, avise a equipe com horário, tela e `X-Request-ID` quando disponível. Evite repetir uma solicitação sem verificar se ela foi registrada. |

Para respostas automáticas, este guia é conteúdo geral. Um chatbot só deve informar empréstimos, atrasos, dados pessoais ou disponibilidade atual se estiver autenticado e tiver consultado uma API autorizada no momento da resposta.
