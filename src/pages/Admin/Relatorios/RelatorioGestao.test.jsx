import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RelatorioGestao, { Consulta } from './RelatorioGestao';
import { CONSULTAS } from './consultas';
import { getRelatorioGestao } from '../../../services/api';
import { exportarExcel } from '../../../utils/exportarArquivo';

jest.mock('../../../services/api', () => ({getRelatorioGestao:jest.fn(),buscarUsuariosRelatorio:jest.fn()}));
jest.mock('../../../utils/exportarArquivo', () => ({exportarExcel:jest.fn(),exportarPDF:jest.fn()}));

const resultado = {itens:[{idLivro:1,titulo:'Livro A',emprestimos:2}],total:120,pagina:1,
  resumo:{registros:120,emprestimos:2},notas:['Conta exemplares efetivamente retirados.'],geradoEm:'2026-10-12T20:00:00Z'};

beforeEach(() => {jest.clearAllMocks(); getRelatorioGestao.mockResolvedValue(resultado);});

test('dez novas consultas são acessíveis e a escolha consulta o endpoint correspondente', async () => {
  render(<RelatorioGestao />);
  expect(screen.getByRole('button',{name:/Alunos, professores e comunidade/})).toBeInTheDocument();
  await screen.findByText('Livro A');
  fireEvent.click(screen.getByRole('button',{name:/Devoluções no período/}));
  await waitFor(() => expect(getRelatorioGestao).toHaveBeenLastCalledWith('devolucoes',expect.any(Object)));
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
  fireEvent.click(screen.getByRole('button',{name:/Inventário por tombo/}));
  await screen.findByText('Livro A');
  resolver({...resultado,itens:[{titulo:'Resposta antiga'}]});
  await waitFor(() => expect(screen.queryByText('Resposta antiga')).not.toBeInTheDocument());
});
