# Relatórios administrativos

A tela `/admin/relatorios` mantém Empréstimos, Usuários em Atraso e Acervo por Grupo e acrescenta **Consultas e Controle**. O acesso exige uma conta da equipe gestora; professores e alunos não podem consultar dados administrativos de outros leitores.

## Consultas disponíveis

| Consulta | Uso |
| --- | --- |
| Circulação dos livros | Mais e menos emprestados, incluindo títulos com zero empréstimos no período. |
| Alunos, professores e comunidade | Cadastro, participação, leitores sem empréstimos, exemplares em posse e atrasados por pessoa. |
| Quem pegou qual livro | Histórico individual ou por título, ISBN e tombo, com as datas de retirada e devolução de cada exemplar. |
| Inventário por tombo | Exemplares, localização, situação atual e títulos ativos/inativos. Inclui desativados. |
| Autores e suas obras | Autores cadastrados, títulos e exemplares vinculados, circulação e autores sem obras. |
| Leitura por turma e série | Matrícula atual e circulação histórica; apresenta separadamente o uso em sala por professores. |
| Devoluções no período | Exemplares devolvidos dentro do intervalo escolhido, inclusive empréstimos iniciados antes do intervalo. |
| Empréstimos renovados | Quantidade acumulada de renovações e prazo atual de cada exemplar. |
| Solicitações e retiradas | Pedidos pendentes, aprovados, negados, expirados e retirados, uma linha por exemplar. |
| Revisão do cadastro do acervo | Campos ausentes para revisão, como autor, editora, ISBN, categoria, gênero, CDD e exemplares. |

As consultas oferecem os filtros relevantes ao seu conteúdo: período, tipo de leitor, pessoa específica, série, turma, ano letivo, finalidade do empréstimo de professor, situação cadastral, participação e situação do exemplar. Busca, ordenação crescente/decrescente e limpeza de filtros complementam a consulta.

### Navegação e apresentação

Consultas e Controle organiza os relatórios em três grupos compactos: **Acervo**, **Leitores** e **Circulação**. O seletor mostra somente os relatórios do grupo escolhido e guarda a última escolha de cada grupo. O título e a descrição identificam o conteúdo antes da consulta.

Busca, período e filtros frequentes de cada relatório ficam visíveis. **Filtros adicionais** expande os demais campos sem apagar os valores ao recolher, com uma indicação de quantos estão ativos. Os atalhos de participação indicam a opção selecionada. Uma ação principal aplica os filtros; limpar restaura a consulta inicial.

Resultados têm uma faixa compacta de totais, contexto dos filtros aplicados e exportações próximas à tabela. As notas de contagem ficam em **Como interpretar este relatório**. A primeira coluna acompanha a rolagem horizontal, e a tabela pode receber foco para navegação por teclado. Em telas pequenas, os controles se reorganizam para a largura disponível.

O relatório de Acervo por Grupo também permite categoria e ano de publicação e mostra reservados, indisponíveis/tombos fixos e desativados. Empréstimos e atrasos passam a incluir professores nos filtros, e o histórico individual aceita professores na busca. Alterar filtros bloqueia exportações até aplicar a consulta, preservando a correspondência entre dados e filtros.

## Como interpretar as contagens

- Empréstimo significa **exemplar efetivamente retirado**. Pedidos não retirados, negados e expirados não entram no ranking de leitura. Uma movimentação com três exemplares representa três empréstimos de exemplares.
- Devolução e renovação são por exemplar. Uma devolução parcial não encerra nem devolve os outros exemplares na consulta.
- O período geralmente filtra a data da retirada. Devoluções usam a data da devolução; solicitações usam a data da solicitação.
- Renovações mostram o total acumulado dos empréstimos iniciados no período. O banco atual não registra quando cada renovação ocorreu, portanto não é possível reconstruir um relatório de eventos de renovação por data.
- Última retirada nos rankings significa última retirada **no recorte escolhido**. Sem empréstimos significa zero naquele período e público, e não necessariamente nunca emprestado.
- Inventário, localização, disponibilidade e situação cadastral são atuais. A turma e a série do histórico vêm do registro do empréstimo. O relatório por turma explicita essa diferença e inclui empréstimos para uso em sala por professores.
- Contas excluídas não aparecem na lista cadastral de leitores; seus empréstimos existentes permanecem no histórico. Contas de professores e usuários têm identidades separadas, mesmo quando seus IDs numéricos coincidem.
- Livros com coautoria contam para cada autor. A soma dos grupos pode repetir exemplares; o resumo do acervo usa títulos e exemplares únicos.
- A revisão cadastral sugere conferência: campos como ISBN ou CDD podem não se aplicar a uma obra. Ela não determina descarte, extravio ou dano, que exigiriam registros próprios.

## Exportação e operação

Consultas e Controle apresenta 50 registros por página. **Excel completo** e **PDF completo** usam todos os resultados dos filtros aplicados, inclusive os de outras páginas. Os arquivos incluem filtros, notas e data de geração. O Excel tem cabeçalhos destacados, filtros de coluna, primeira linha fixa e uma aba de contexto.

O endpoint `GET /relatorios/gestao/{tipo}` valida tipos de consulta, datas, ordem e tamanho de página. As tabelas são lidas com paginação estável, inclusive acima do limite de linhas da API do Supabase, e consultas independentes são executadas em paralelo. A paginação é feita depois da agregação para preservar rankings, zeros e totais; o banco ainda é lido integralmente para formar cada população. Para volumes muito maiores, o próximo passo é agregar e paginar no PostgreSQL.

Não há alterações de schema nem migrações nesta implementação. Não foram utilizados dados reais para os testes locais.

## Exemplos de conferência

1. Em Circulação dos livros, use **Sem empréstimos** e depois retire um exemplar de um título listado. Consulte novamente e confirme que ele deixa a lista, mantendo o mesmo recorte.
2. Em Quem pegou qual livro, selecione um professor no campo de leitor específico e confira somente seus exemplares, inclusive finalidade pessoal ou para turma.
3. Devolva apenas um exemplar de um empréstimo com vários itens. Ele deve aparecer em Devoluções no período e os outros devem continuar em posse no histórico.
4. Em Leitura por turma e série, confira a coluna Uso em sala após uma retirada de professor para a turma.
5. Gere uma consulta com mais de 50 resultados e exporte. Compare o total do arquivo com o total da consulta, não somente com a página visível.
6. Em Acervo por Grupo, confira Categoria e Ano de publicação e a coluna Desativados.
