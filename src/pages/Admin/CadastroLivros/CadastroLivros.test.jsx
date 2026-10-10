import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CadastroLivros from './CadastroLivros';
import { getBooksForManagement } from '../../../services/api';

const mockToast = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { tipo: 'admin' } }) }));
jest.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ addToast: mockToast }) }));
jest.mock('../../../services/api', () => ({ getBooksForManagement: jest.fn(), getGeneros: async () => [] }));
jest.mock('./components/BookForm/BookFormModal', () => ({ bookToEdit, initialSection }) => <div>Corrigir {bookToEdit.livTitulo}: {initialSection}</div>);
jest.mock('./components/BookInfo/BookInfoModal', () => () => null);

const books = [
  { idLivro: 1, livTitulo: 'Sem cópias', livAtivo: true, exemplares_cadastrados: 0, total_exemplares: 0 },
  { idLivro: 2, livTitulo: 'Tudo desativado', livAtivo: true, exemplares_cadastrados: 2, total_exemplares: 0 },
  { idLivro: 3, livTitulo: 'Em circulação', livAtivo: true, exemplares_cadastrados: 1, total_exemplares: 1, emprestados: 1 },
];

beforeEach(() => { getBooksForManagement.mockResolvedValue(books); });

test('aviso filtra pendências e oferece acesso direto à correção', async () => {
  render(<CadastroLivros />);
  expect(await screen.findByText('2 títulos ativos fora do acervo.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver títulos' }));
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Em circulação' })).not.toBeInTheDocument());
  expect(screen.getByRole('heading', { name: 'Sem cópias' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Tudo desativado' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Exemplares'), { target: { value: 'sem' } });
  expect(screen.queryByRole('heading', { name: 'Tudo desativado' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Corrigir exemplares' }));
  expect(await screen.findByText('Corrigir Sem cópias: copies')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
  expect(screen.getByRole('heading', { name: 'Em circulação' })).toBeInTheDocument();
});

test('um título emprestado não dispara o aviso de falta de exemplares', async () => {
  getBooksForManagement.mockResolvedValue([books[2]]);
  render(<CadastroLivros />);
  await screen.findByRole('heading', { name: 'Em circulação' });
  expect(screen.queryByRole('button', { name: 'Ver títulos' })).not.toBeInTheDocument();
});
