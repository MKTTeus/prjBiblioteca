import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Recomendacoes from './Recomendacoes';
import { getPainelRecomendacoes, avaliarLivro, solicitarLivro } from '../../../services/api';
let mockUser = { tipo: 'Aluno', email: 'aluno@teste.example' };
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ addToast: jest.fn() }) }));
jest.mock('../../../services/api', () => ({ getPainelRecomendacoes: jest.fn(), avaliarLivro: jest.fn(), solicitarLivro: jest.fn() }));
jest.mock('../../../components/BookCard/BookCard', () => ({ book, onRequestLoan, solicitando, statusSolicitacao }) =>
  <article><h3>{book.livTitulo}</h3><button disabled={solicitando || !!statusSolicitacao} onClick={() => onRequestLoan(book)}>Solicitar</button></article>);

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { tipo: 'Aluno', email: 'aluno@teste.example' };
  getPainelRecomendacoes.mockResolvedValue({
    itens: [{ livro: { idLivro: 2, livTitulo: 'Nova leitura' }, motivo: 'Temas semelhantes.' }],
    avaliacoes: [{ idLivro: 1, livTitulo: 'Livro devolvido', nota: null }],
  });
  avaliarLivro.mockResolvedValue({ nota: 5 });
  solicitarLivro.mockResolvedValue({});
});

test.each(['Comunidade', 'admin'])('não consulta ou renderiza o recurso para %s', tipo => {
  mockUser.tipo = tipo;
  const { container } = render(<Recomendacoes />);
  expect(container).toBeEmptyDOMElement();
  expect(getPainelRecomendacoes).not.toHaveBeenCalled();
});

test('avaliação opcional, estrelas acessíveis, atualização das sugestões e edição', async () => {
  render(<Recomendacoes />);
  const form = await screen.findByRole('form', { name: 'Avaliar Livro devolvido' });
  expect(within(form).getByRole('button', { name: 'Salvar avaliação' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
  expect(avaliarLivro).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Avaliar livros devolvidos' }));
  fireEvent.click(screen.getByRole('radio', { name: '5 estrelas' }));
  getPainelRecomendacoes.mockResolvedValue({
    itens: [{ livro: { idLivro: 2, livTitulo: 'Nova leitura' }, motivo: 'Temas semelhantes.' }],
    avaliacoes: [{ idLivro: 1, livTitulo: 'Livro devolvido', nota: 5 }],
  });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar avaliação' }));
  await waitFor(() => expect(avaliarLivro).toHaveBeenCalledWith(1, 5));
  await waitFor(() => expect(getPainelRecomendacoes).toHaveBeenCalledTimes(2));
  const summary = await screen.findByText('Minhas avaliações (1)');
  fireEvent.click(summary);
  fireEvent.click(screen.getByRole('radio', { name: '2 estrelas' }));
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar avaliação' }));
  await waitFor(() => expect(avaliarLivro).toHaveBeenCalledWith(1, 2));
});

test('falha do painel permite tentar novamente', async () => {
  getPainelRecomendacoes.mockRejectedValueOnce(new Error('offline'));
  render(<Recomendacoes />);
  expect(await screen.findByText(/Não foi possível carregar as sugestões/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar sugestões' }));
  expect(await screen.findByText('Nova leitura')).toBeInTheDocument();
});

test('reutiliza solicitação e impede envio duplicado', async () => {
  render(<Recomendacoes />);
  const button = await screen.findByRole('button', { name: 'Solicitar' });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(solicitarLivro).toHaveBeenCalledTimes(1));
  expect(solicitarLivro).toHaveBeenCalledWith({ idLivro: 2 });
  expect(button).toBeDisabled();
});

test('carrossel navega pelas sugestões e atualiza os limites após a rolagem', async () => {
  getPainelRecomendacoes.mockResolvedValue({
    itens: [2, 3, 4, 5].map(id => ({
      livro: { idLivro: id, livTitulo: `Livro ${id}` }, motivo: 'Temas semelhantes.',
    })),
    avaliacoes: [],
  });
  render(<Recomendacoes />);
  const track = await screen.findByRole('region', { name: 'Livros recomendados' });
  const proximo = screen.getByRole('button', { name: 'Próxima sugestão' });
  const anterior = screen.getByRole('button', { name: 'Sugestão anterior' });
  Object.defineProperties(track, {
    clientWidth: { configurable: true, value: 600 },
    scrollWidth: { configurable: true, value: 1200 },
    scrollLeft: { configurable: true, writable: true, value: 0 },
  });
  track.style.columnGap = '24px';
  track.firstElementChild.getBoundingClientRect = () => ({ width: 280 });
  track.scrollBy = jest.fn();
  fireEvent.scroll(track);
  expect(anterior).toBeDisabled();
  expect(proximo).toBeEnabled();
  fireEvent.click(proximo);
  expect(track.scrollBy).toHaveBeenCalledWith({ left: 304, behavior: 'smooth' });
  track.scrollLeft = 600;
  fireEvent.scroll(track);
  expect(proximo).toBeDisabled();
  fireEvent.click(anterior);
  expect(track.scrollBy).toHaveBeenCalledWith({ left: -304, behavior: 'smooth' });
});

test('estado vazio e erro ao salvar não enviam avaliação implícita', async () => {
  getPainelRecomendacoes.mockResolvedValue({
    itens: [], avaliacoes: [{ idLivro: 1, livTitulo: 'Livro devolvido', nota: null }],
  });
  avaliarLivro.mockRejectedValue(new Error('offline'));
  render(<Recomendacoes />);
  expect(await screen.findByText(/Não há novas sugestões/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: '4 estrelas' }));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar avaliação' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar');
  expect(screen.getByRole('radio', { name: '4 estrelas' })).toBeChecked();
});

test('troca de conta descarta respostas atrasadas do aluno anterior', async () => {
  let resolve;
  getPainelRecomendacoes.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const { rerender } = render(<Recomendacoes />);
  mockUser = { tipo: 'Aluno', email: 'outro@teste.example' };
  rerender(<Recomendacoes />);
  expect(await screen.findByText('Nova leitura')).toBeInTheDocument();
  resolve({ itens: [{ livro: { idLivro: 99, livTitulo: 'Leitura da conta anterior' } }], avaliacoes: [] });
  await waitFor(() => expect(screen.queryByText('Leitura da conta anterior')).not.toBeInTheDocument());
});
