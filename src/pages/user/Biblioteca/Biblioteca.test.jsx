import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import Biblioteca from './Biblioteca';
import { getBooksPage } from '../../../services/api';

jest.mock('../../../services/api', () => ({ getBooksPage: jest.fn(), getEmprestimos: jest.fn() }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { tipo: 'Comunidade' } }) }));
jest.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ addToast: jest.fn() }) }));
jest.mock('../../../components/BookCard/BookCard', () => ({ book }) => <h3>{book.livTitulo}</h3>);

test('navegar entre páginas busca somente os livros da página escolhida', async () => {
  getBooksPage.mockImplementation(({ page }) => Promise.resolve({
    itens: [{ idLivro: page, livTitulo: `Livro da página ${page}` }], total: 21,
  }));
  render(<Biblioteca />);
  expect(await screen.findByText('Livro da página 1')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
  expect(await screen.findByText('Livro da página 2')).toBeInTheDocument();
  expect(getBooksPage).toHaveBeenLastCalledWith({ page: 2, per_page: 20 });
});

test('avisa quando os livros exibidos são resultados parecidos com a busca', async () => {
  getBooksPage.mockResolvedValue({ itens: [{ idLivro: 1, livTitulo: 'Dom Casmurro' }], total: 1, aproximado: true });
  render(<Biblioteca />);
  expect(await screen.findByText('Dom Casmurro')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('resultados parecidos');
});

test('não mostra o aviso quando a busca é exata', async () => {
  getBooksPage.mockResolvedValue({ itens: [{ idLivro: 1, livTitulo: 'Dom Casmurro' }], total: 1 });
  render(<Biblioteca />);
  expect(await screen.findByText('Dom Casmurro')).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
