# Orientações da Novi para gestores da Sala de Leitura

Este guia descreve as telas do gestor nesta versão. A Novi explica o procedimento; quem confere os dados e confirma ações é o gestor. O nome do espaço é **Sala de Leitura**. “Biblioteca” ainda aparece como rótulo de uma opção do menu do sistema, mas não é o nome do espaço.

## Cadastrar um livro: passo a passo

1. Abra **Cadastro de Livros** no menu do gestor e clique em **Novo Livro**.
2. Em **Informações Básicas**, informe o título e os outros dados disponíveis, como autores, gênero, ISBN e capa. ISBN e preenchimento com IA ajudam no preenchimento, mas confira os dados sugeridos antes de salvar.
3. Em **Informações de Publicação**, revise os dados bibliográficos. O formulário exige **título** e **número de páginas maior que zero**. Alguns campos opcionais em branco podem gerar uma confirmação antes de salvar.
4. Em **Editar Tombos**, informe ao menos **um exemplar**, confira a quantidade e o prefixo de tombo. O título representa a obra; cada exemplar é uma cópia física identificada por tombo.
5. Clique em **Salvar Atualizações** e confira a mensagem de sucesso e a lista. Se o título não aparecer no acervo consultado pelos leitores, verifique se o título e pelo menos um exemplar estão ativos.

O botão de salvar está no fim da janela **Novo Livro**. O cadastro de autor e gênero pode ser resolvido no mesmo fluxo; evite criar duplicatas. A ficha catalográfica é uma função separada, acessível na gestão do título depois do cadastro. A Novi nunca cadastra por conta própria.

## Aprovar solicitação e registrar retirada: passo a passo

1. Abra **Empréstimos → Solicitações** e localize a solicitação na fila.
2. Confira usuário, título, exemplares e estado. Para uma solicitação pendente, escolha **Aprovar** ou **Negar** conforme o atendimento.
3. Aprovar separa o exemplar e inicia o prazo de retirada; ainda não é um empréstimo ativo.
4. Quando a pessoa receber fisicamente o livro, encontre a solicitação aprovada e clique em **Retirar** para registrar a entrega. Confira o novo estado. Se expirou, verifique a tela antes de tentar retirar.

O prazo depende da configuração e da data de aprovação. A Novi não consulta uma solicitação individual nem confirma que a entrega ocorreu.

## Empréstimo direto, devolução e renovação: passo a passo

Para um empréstimo direto, abra **Empréstimos e Devoluções**, clique em **Novo Empréstimo**, escolha o usuário e o exemplar disponível e confirme na janela. Esse fluxo já cria empréstimo ativo, sem passar pela fila de solicitações.

Para devolver, encontre a linha da movimentação na mesma tela, confira o título e o tombo, clique em **Devolver** e confirme. A devolução pode ser parcial por exemplar; outros itens da movimentação podem continuar ativos.

Para renovar, encontre um item ativo, clique em **Renovar**, informe uma nova data posterior ao vencimento atual e confirme. O limite de renovações é configurável; confira o resultado na tela. A Novi não calcula o prazo real de um empréstimo específico.

## Cadastro de pessoas e professores

Use **Cadastro de Alunos**, **Cadastro da Comunidade** ou **Cadastro de Administradores** conforme o perfil. O professor é uma conta administrativa marcada como professor e usa seu painel próprio. Para importar alunos ou comunidade, use a função de importação da tela correspondente e revise erros por linha. A Novi não recebe arquivos, senhas, CPF ou RA pelo chat.

## Relatórios, configurações e ações sensíveis

Em **Relatórios**, escolha a visão de empréstimos, atrasos ou acervo e ajuste os filtros disponíveis. Os números atuais e dados pessoais só aparecem na tela autenticada, não na resposta da Novi.

Em **Configurações Gerais**, confira os limites e prazos salvos antes de comunicá-los. **Configurações de Notificações** reúne preferências de lembretes; **Configurações de E-mail** mostra o estado do envio. A Novi não dispara mensagens.

Para **Ano Letivo** e **Backups**, leia as confirmações na tela, confira os dados e envolva a equipe responsável. A Novi explica o processo, mas não encerra o ano, exporta dados ou restaura backup. Uma restauração substitui dados posteriores ao ponto escolhido e pode encerrar sessões.

## Modo escuro e aparência

No painel do gestor, abra **Configurações → Geral**. Na seção **Aparência**, altere o controle **Tema do sistema** de **Claro** para **Escuro**. A mudança é salva para a própria conta administrativa. Se falhar, a tela mostra um aviso e restaura o tema anterior. Não é necessário usar as Configurações de Segurança.

## Excluí ou desativei um livro: como recuperar?

Em **Cadastro de Livros**, o botão de exclusão permanente pede confirmação. Se o aviso ainda está aberto, cancele antes de confirmar. Se o título foi apenas **desativado**, a gestão pode reativá-lo na lista; o catálogo público voltará a exibi-lo quando houver exemplar ativo. Se a **exclusão permanente** foi concluída, não há desfazer na tela. Não prometa recuperação nem recrie o cadastro sem verificar vínculos: encaminhe o caso à equipe responsável para avaliar cópias de segurança e um ensaio de restauração em homologação. Restaurar o sistema inteiro pode substituir alterações posteriores.

## Consultas simples e limites de dados

A Novi pode responder diretamente ao gestor autenticado com o **nome da própria conta**, campos bibliográficos mínimos de até cinco livros (título, ISBN, páginas, ano e status), contagens de títulos e exemplares, contagens de alunos cadastrados não excluídos e de professores ativos, e indicadores agregados de circulação. Ela informa o critério da contagem e a tela de conferência. A disponibilidade e os totais podem mudar depois da consulta.

A Novi não apresenta nomes, contatos, RA, CPF, histórico individual, lista de professores, planilhas ou linhas detalhadas de relatórios no chat. Para atender uma pessoa específica, use a tela autenticada apropriada. Ela não acessa senhas nem envia as linhas consultadas ao modelo de linguagem.
