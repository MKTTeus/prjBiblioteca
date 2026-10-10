import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import Biblioteca from './Biblioteca';
import { getBooks } from '../../../services/api';

jest.mock('../../../services/api', () => ({ getBooks: jest.fn(), getEmprestimos: jest.fn() }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { tipo: 'Comunidade' } }) }));
jest.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ addToast: jest.fn() }) }));
jest.mock('../../../components/BookCard/BookCard', () => ({ book }) => <h3>{book.livTitulo}</h3>);

test('navegar entre páginas não refaz a consulta nem oculta títulos posteriores', async () => {
  getBooks.mockResolvedValue(Array.from({ length: 21 }, (_, i) => ({ idLivro: i + 1, livTitulo: `Livro ${i + 1}` })));
  render(<Biblioteca />);
  expect(await screen.findByText('Livro 1')).toBeInTheDocument();
  expect(screen.queryByText('Livro 21')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
  expect(screen.getByText('Livro 21')).toBeInTheDocument();
  expect(getBooks).toHaveBeenCalledTimes(1);
});
