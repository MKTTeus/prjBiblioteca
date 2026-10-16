const coluna = (chave, label, data = false) => ({ chave, label, data });
const livro = [coluna('titulo','Livro'), coluna('autores','Autores'), coluna('isbn','ISBN')];
const leitor = [coluna('usuario','Leitor'), coluna('tipo','Tipo'), coluna('serie','Série'), coluna('turma','Turma')];
const historico = [...leitor, coluna('finalidade','Finalidade'), coluna('titulo','Livro'), coluna('tombo','Tombo'), coluna('dataEmprestimo','Retirada',true), coluna('dataPrevistaDevolucao','Prazo',true), coluna('dataDevolucao','Devolução',true), coluna('situacao','Situação')];

export const GRUPOS_CONSULTAS = [
  { nome:'Acervo', descricao:'Livros, exemplares, autores e revisão do cadastro.' },
  { nome:'Leitores', descricao:'Participação de alunos, professores, comunidade e turmas.' },
  { nome:'Circulação', descricao:'Histórico, solicitações, devoluções e renovações.' },
];

export const CONSULTAS = [
  { id:'livros', titulo:'Circulação dos livros', descricao:'Mais emprestados, menos emprestados e títulos sem empréstimos no período.', grupo:'Acervo', periodo:true, publico:true, atividade:true, participacao:true,
    ordenar:'emprestimos', colunas:[...livro, coluna('editora','Editora'), coluna('exemplares','Exemplares'), coluna('disponiveis','Disponíveis hoje'), coluna('emprestimos','Empréstimos'), coluna('ultimoEmprestimo','Última retirada no período',true)],
    ordenacoes:[['emprestimos','Empréstimos'],['titulo','Título'],['exemplares','Exemplares'],['ultimoEmprestimo','Última retirada']] },
  { id:'leitores', titulo:'Alunos, professores e comunidade', descricao:'Cadastro e participação: quem mais lê, quem não retirou livros e pendências por leitor.', grupo:'Leitores', periodo:true, publico:true, atividade:true, pessoa:true, participacao:true,
    ordenar:'emprestimos', colunas:[...leitor, coluna('ra','RA'), coluna('situacao','Cadastro'), coluna('emprestimos','Empréstimos'), coluna('livrosDistintos','Títulos distintos'), coluna('ativos','Em posse'), coluna('atrasados','Em atraso'), coluna('devolvidos','Devolvidos'), coluna('ultimoEmprestimo','Última retirada no período',true)],
    ordenacoes:[['emprestimos','Empréstimos'],['usuario','Nome'],['ativos','Em posse'],['atrasados','Atrasos'],['ultimoEmprestimo','Última retirada']] },
  { id:'historico', titulo:'Quem pegou qual livro', descricao:'Histórico detalhado por aluno, professor, livro ou tombo, inclusive empréstimos para turmas.', grupo:'Circulação', periodo:true, publico:true, pessoa:true, status:true,
    ordenar:'dataEmprestimo', colunas:historico, ordenacoes:[['dataEmprestimo','Retirada'],['usuario','Leitor'],['titulo','Livro'],['tombo','Tombo']] },
  { id:'inventario', titulo:'Inventário por tombo', descricao:'Cada exemplar físico, sua localização e situação atual; inclui exemplares desativados.', grupo:'Acervo', atividade:true, status:true,
    ordenar:'titulo', ordem:'asc', colunas:[...livro, coluna('tombo','Tombo'), coluna('localizacao','Localização'), coluna('status','Exemplar'), coluna('situacao','Título'), coluna('anoPublicacao','Ano de publicação')],
    ordenacoes:[['titulo','Título'],['tombo','Tombo'],['status','Situação'],['localizacao','Localização'],['anoPublicacao','Ano de publicação']] },
  { id:'autores', titulo:'Autores e suas obras', descricao:'Autores cadastrados, títulos, exemplares e circulação, incluindo autores sem obras ou empréstimos.', grupo:'Acervo', periodo:true, publico:true, atividade:true, participacao:true,
    ordenar:'emprestimos', colunas:[coluna('autor','Autor'), coluna('abnt','Nome ABNT'), coluna('titulos','Títulos'), coluna('exemplares','Exemplares'), coluna('emprestimos','Empréstimos')],
    ordenacoes:[['emprestimos','Empréstimos'],['autor','Autor'],['titulos','Títulos'],['exemplares','Exemplares']] },
  { id:'turmas', titulo:'Leitura por turma e série', descricao:'Compare a circulação entre turmas e séries e identifique grupos sem empréstimos.', grupo:'Leitores', periodo:true, publico:true, participacao:true,
    ordenar:'emprestimos', colunas:[coluna('serie','Série'), coluna('turma','Turma'), coluna('alunos','Alunos no cadastro atual'), coluna('leitores','Alunos leitores no período'), coluna('professores','Professores para a turma'), coluna('emprestimosTurma','Uso em sala (exemplares)'), coluna('emprestimos','Empréstimos')],
    ordenacoes:[['emprestimos','Empréstimos'],['serie','Série'],['turma','Turma'],['alunos','Alunos'],['leitores','Leitores']] },
  { id:'devolucoes', titulo:'Devoluções no período', descricao:'Exemplares devolvidos nas datas escolhidas, mesmo quando a retirada ocorreu antes do período.', grupo:'Circulação', periodo:true, publico:true, pessoa:true,
    ordenar:'dataDevolucao', colunas:historico, ordenacoes:[['dataDevolucao','Devolução'],['usuario','Leitor'],['titulo','Livro'],['tombo','Tombo']] },
  { id:'renovacoes', titulo:'Empréstimos renovados', descricao:'Quantidade acumulada de renovações por exemplar e leitor, com o prazo atual.', grupo:'Circulação', periodo:true, publico:true, pessoa:true,
    ordenar:'renovacoes', colunas:[...historico, coluna('renovacoes','Renovações')], ordenacoes:[['renovacoes','Renovações'],['dataEmprestimo','Retirada'],['usuario','Leitor'],['titulo','Livro']] },
  { id:'solicitacoes', titulo:'Solicitações e retiradas', descricao:'Pedidos pendentes, aprovados, expirados, negados e retirados; acompanhe reservas para retirada.', grupo:'Circulação', periodo:true, publico:true, pessoa:true, status:true,
    ordenar:'dataSolicitacao', colunas:[...leitor, coluna('finalidade','Finalidade'), coluna('titulo','Livro'), coluna('tombo','Tombo'), coluna('dataSolicitacao','Solicitação',true), coluna('situacao','Exemplar'), coluna('statusConfirmacao','Confirmação'), coluna('dataEmprestimo','Retirada',true)],
    ordenacoes:[['dataSolicitacao','Solicitação'],['usuario','Leitor'],['titulo','Livro'],['situacao','Situação']] },
  { id:'cadastro', titulo:'Revisão do cadastro do acervo', descricao:'Obras sem autor, editora, ISBN, gênero, CDD ou exemplares para revisão.', grupo:'Acervo', atividade:true,
    ordenar:'titulo', ordem:'asc', colunas:[...livro, coluna('editora','Editora'), coluna('exemplares','Exemplares'), coluna('pendencias','Campos para revisar')],
    ordenacoes:[['titulo','Título'],['pendencias','Pendências'],['exemplares','Exemplares']] },
];

export function filtrosIniciais(config) {
  return { dataInicio:'', dataFim:'', tipoUsuario:'todos', atividade:'todos', serie:'', turma:'', anoLetivo:'',
    idUsuario:'', idAdminProfessor:'', finalidade:'', q:'', status:'', participacao:'todos',
    ordenarPor:config.ordenar, ordem:config.ordem || 'desc' };
}

export const LABELS = { ativo:'Ativo', atrasado:'Em atraso', devolvido:'Devolvido', PESSOAL:'Pessoal', TURMA:'Para turma' };

export function valorCelula(item, coluna) {
  const valor = item[coluna.chave];
  if (valor === undefined || valor === null || valor === '') return '—';
  if (coluna.data) {
    const data = String(valor).slice(0,10);
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  return LABELS[valor] || valor;
}
