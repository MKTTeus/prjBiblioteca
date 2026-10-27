import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BuscaUsuarioInput from './BuscaUsuarioInput';
import RelatorioEmprestimos from './RelatorioEmprestimos';
import { buscarUsuariosRelatorio, getRelatorioEmprestimos } from '../../../services/api';

jest.mock('../../../services/api', () => ({buscarUsuariosRelatorio:jest.fn(),getRelatorioEmprestimos:jest.fn(),getRelatorioEmprestimosMensal:jest.fn()}));
jest.mock('../../../utils/exportarArquivo', () => ({exportarExcel:jest.fn(),exportarPDF:jest.fn()}));

beforeEach(() => {jest.clearAllMocks(); buscarUsuariosRelatorio.mockResolvedValue({itens:[{idAdminProfessor:8,usuNome:'Professor João',usuTipo:'Professor'}]});});

test('autocomplete seleciona professor sem inventar um idUsuario', async () => {
  const selecionar=jest.fn();
  render(<BuscaUsuarioInput onSelecionar={selecionar} onLimpar={jest.fn()} />);
  const busca=screen.getByRole('textbox',{name:'Buscar leitor específico'});
  fireEvent.focus(busca); fireEvent.change(busca,{target:{value:'João'}});
  fireEvent.click(await screen.findByRole('button',{name:'Professor João Professor'}));
  expect(selecionar).toHaveBeenCalledWith({idAdminProfessor:8,usuNome:'Professor João',usuTipo:'Professor'});
});

test('histórico existente envia a identidade correta e limpa o período ao selecionar professor', async () => {
  getRelatorioEmprestimos.mockResolvedValue({itens:[],resumo:{ativos:0,atrasados:0,devolvidos:0,total:0}});
  render(<RelatorioEmprestimos />);
  await waitFor(() => expect(getRelatorioEmprestimos).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button',{name:'Filtros adicionais'}));
  const busca=screen.getByRole('textbox',{name:'Buscar leitor específico'});
  fireEvent.focus(busca); fireEvent.change(busca,{target:{value:'João'}});
  fireEvent.click(await screen.findByRole('button',{name:'Professor João Professor'}));
  fireEvent.click(screen.getByRole('button',{name:'Filtrar'}));
  await waitFor(() => expect(getRelatorioEmprestimos).toHaveBeenLastCalledWith(expect.objectContaining({idAdminProfessor:8,idUsuario:'',dataInicio:'',dataFim:'',tipoUsuario:'todos'})));
  expect(screen.getByRole('button',{name:'Remover filtro de leitor'})).toBeInTheDocument();
});
