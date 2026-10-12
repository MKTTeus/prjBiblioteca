import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RelatorioGestao, { Consulta } from './RelatorioGestao';
import { CONSULTAS } from './consultas';
import { getRelatorioGestao } from '../../../services/api';
import { exportarExcel } from '../../../utils/exportarArquivo';

jest.mock('../../../services/api', () => ({getRelatorioGestao:jest.fn(),buscarUsuariosRelatorio:jest.fn()}));
jest.mock('../../../utils/exportarArquivo', () => ({exportarExcel:jest.fn(),exportarPDF:jest.fn()}));

const resultado = {itens:[{idLivro:1,titulo:'Livro A',emprestimos:2}],total:120,pagina:1,
  resumo:{registros:120,emprestimos:2},notas:['Conta exemplares efetivamente retirados.'],geradoEm:'2026-10-12T20:00:00Z'};

beforeEach(() => {jest.clearAllMocks(); getRelatorioGestao.mockResolvedValue(resultado);});

test('grupos mostram somente relatórios relacionados e a seleção consulta o endpoint correspondente', async () => {
  render(<RelatorioGestao />);
  await screen.findByText('Livro A');
  const grupos = screen.getByRole('group',{name:'Grupos de relatórios'});
  expect(within(grupos).getAllByRole('button')).toHaveLength(3);
  expect(screen.getByRole('button',{name:'Acervo'})).toHaveAttribute('aria-pressed','true');
  expect(within(screen.getByRole('combobox',{name:'Relatório de acervo'})).getAllByRole('option')).toHaveLength(4);
  fireEvent.click(screen.getByRole('button',{name:'Leitores'}));
  expect(within(screen.getByRole('combobox',{name:'Relatório de leitores'})).getAllByRole('option')).toHaveLength(2);
  expect(screen.getByRole('combobox',{name:'Tipo de leitor'})).toBeVisible();
  await waitFor(() => expect(getRelatorioGestao).toHaveBeenLastCalledWith('leitores',expect.any(Object)));
  fireEvent.click(screen.getByRole('button',{name:'Circulação'}));
  const selecao = screen.getByRole('combobox',{name:'Relatório de circulação'});
  expect(within(selecao).getAllByRole('option')).toHaveLength(4);
  fireEvent.change(selecao,{target:{value:'devolucoes'}});
  await waitFor(() => expect(getRelatorioGestao).toHaveBeenLastCalledWith('devolucoes',expect.any(Object)));
});

test('voltar ao grupo mantém o relatório escolhido sem apresentar os dez cards', async () => {
  const {container} = render(<RelatorioGestao />);
  await screen.findByText('Livro A');
  fireEvent.change(screen.getByRole('combobox',{name:'Relatório de acervo'}),{target:{value:'inventario'}});
  await waitFor(() => expect(getRelatorioGestao).toHaveBeenLastCalledWith('inventario',expect.any(Object)));
  fireEvent.click(screen.getByRole('button',{name:'Circulação'}));
  await screen.findByText('Livro A');
  fireEvent.click(screen.getByRole('button',{name:'Acervo'}));
  expect(screen.getByRole('combobox',{name:'Relatório de acervo'})).toHaveValue('inventario');
  expect(container.querySelector('.rel-consultas-grid')).toBeNull();
});

test('filtros adicionais recolhem sem apagar valores e sinalizam os filtros ativos', async () => {
  render(<Consulta config={CONSULTAS[0]} />);
  await screen.findByText('Livro A');
  const toggle = screen.getByRole('button',{name:'Filtros adicionais'});
  expect(toggle).toHaveAttribute('aria-expanded','false');
  expect(screen.queryByRole('combobox',{name:'Série'})).not.toBeInTheDocument();
  fireEvent.click(toggle);
  const serie = screen.getByRole('combobox',{name:'Série'});
  fireEvent.change(serie,{target:{value:'6º Ano'}});
  expect(toggle).toHaveTextContent('1 ativo');
  fireEvent.click(toggle);
  expect(serie).not.toBeVisible();
  expect(screen.getByRole('button',{name:'PDF completo'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Consultar'}));
  await waitFor(() => expect(getRelatorioGestao).toHaveBeenLastCalledWith('livros',expect.objectContaining({serie:'6º Ano'})));
  await waitFor(() => expect(screen.getByRole('button',{name:'PDF completo'})).toBeEnabled());
  fireEvent.click(toggle);
  expect(serie).toHaveValue('6º Ano');
  fireEvent.click(screen.getByRole('button',{name:'Limpar filtros'}));
  await waitFor(() => expect(serie).toHaveValue(''));
  expect(toggle).not.toHaveTextContent('ativo');
});

test('atalho de zero circulação filtra e exportação pede todos os registros', async () => {
  render(<Consulta config={CONSULTAS[0]} />);
  await screen.findByText('Livro A');
  fireEvent.click(screen.getByRole('button',{name:'Sem empréstimos'}));
  await waitFor(() => expect(getRelatorioGestao).toHaveBeenLastCalledWith('livros',expect.objectContaining({participacao:'sem',ordem:'asc'})));
  await waitFor(() => expect(screen.getByRole('button',{name:'Excel completo'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Excel completo'}));
  await waitFor(() => expect(getRelatorioGestao).toHaveBeenLastCalledWith('livros',expect.objectContaining({participacao:'sem',exportar:true})));
  await waitFor(() => expect(exportarExcel).toHaveBeenCalledWith(expect.objectContaining({linhas:expect.any(Array),detalhes:expect.arrayContaining(['Registros: 120'])})));
});

test('editar filtro bloqueia exportação; paginação mantém os filtros aplicados', async () => {
  render(<Consulta config={CONSULTAS[0]} />);
  await screen.findByText('Livro A');
  fireEvent.change(screen.getByLabelText('Busca'),{target:{value:'outro'}});
  expect(screen.getByRole('button',{name:'PDF completo'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Próxima'}));
  await waitFor(() => expect(getRelatorioGestao).toHaveBeenLastCalledWith('livros',expect.objectContaining({q:'',pagina:2})));
  await screen.findByText('Livro A');
  fireEvent.click(screen.getByRole('button',{name:'Consultar'}));
  await waitFor(() => expect(getRelatorioGestao).toHaveBeenLastCalledWith('livros',expect.objectContaining({q:'outro',pagina:1})));
});

test('período invertido é rejeitado antes de consultar', async () => {
  render(<Consulta config={CONSULTAS[0]} />);
  await screen.findByText('Livro A');
  fireEvent.change(screen.getByLabelText('De'),{target:{value:'2026-10-12'}});
  fireEvent.change(screen.getByLabelText('Até'),{target:{value:'2026-10-01'}});
  fireEvent.click(screen.getByRole('button',{name:'Consultar'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('A data inicial');
  expect(getRelatorioGestao).toHaveBeenCalledTimes(1);
});

test('troca de relatório descarta resposta pendente do relatório anterior', async () => {
  let resolver;
  getRelatorioGestao.mockReturnValueOnce(new Promise(done => {resolver=done;}));
  render(<RelatorioGestao />);
  fireEvent.change(screen.getByRole('combobox',{name:'Relatório de acervo'}),{target:{value:'inventario'}});
  await screen.findByText('Livro A');
  resolver({...resultado,itens:[{titulo:'Resposta antiga'}]});
  await waitFor(() => expect(screen.queryByText('Resposta antiga')).not.toBeInTheDocument());
});
