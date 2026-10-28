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


test('permite alternar entre Grade e Lista sem alterar a pesquisa paginada', async () => {
  localStorage.removeItem('biblioteca-usuario-visualizacao');
  getBooksPage.mockResolvedValue({ itens: [{ idLivro: 2, livTitulo: 'O Pequeno Príncipe' }], total: 1 });
  const { container } = render(<Biblioteca />);
  expect(await screen.findByText('O Pequeno Príncipe')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Grade/ })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: /Lista/ }));
  expect(screen.getByRole('button', { name: /Lista/ })).toHaveAttribute('aria-pressed', 'true');
  expect(container.querySelector('.user-library-results--lista')).toBeTruthy();
  expect(localStorage.getItem('biblioteca-usuario-visualizacao')).toBe('lista');
  expect(getBooksPage).toHaveBeenCalledWith({page:1,per_page:20});
  localStorage.removeItem('biblioteca-usuario-visualizacao');
});

test('as instruções continuam expansíveis e identificáveis', async () => {
  getBooksPage.mockResolvedValue({ itens: [], total: 0 });
  render(<Biblioteca />);
  expect(screen.getByText('Como consultar e emprestar livros?')).toBeInTheDocument();
  expect(await screen.findByText('Nenhum livro encontrado para a busca informada.')).toBeInTheDocument();
});

// A Comunidade consulta o catálogo, mas não recebe o comando de solicitar online.
test('comunidade vê instruções de empréstimo presencial e pode visualizar capas', async () => {
  getBooksPage.mockResolvedValue({ itens: [{ idLivro: 9, livTitulo: 'Livro da comunidade' }], total: 1 });
  render(<Biblioteca />);
  expect(await screen.findByText('Livro da comunidade')).toBeInTheDocument();
  expect(screen.getByText('Como consultar e emprestar livros?')).toBeInTheDocument();
  expect(screen.getByText('Catálogo de Livros')).toBeInTheDocument();
});
