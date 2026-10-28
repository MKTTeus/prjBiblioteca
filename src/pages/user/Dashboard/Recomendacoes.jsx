import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaBookOpen, FaChevronLeft, FaChevronRight, FaRegStar, FaStar } from 'react-icons/fa';
import BookCard from '../../../components/BookCard/BookCard';
import { BookOpen, ChevronRight, RefreshCw } from 'lucide-react';
import LoadingButton from '../../../components/LoadingButton/LoadingButton';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { getPainelRecomendacoes, avaliarLivro, solicitarLivro } from '../../../services/api';
import { getErrorMessage } from '../../../utils/apiError';
import './Recomendacoes.css';

function AvaliacaoLivro({ livro, onSaved }) {
  const [nota, setNota] = useState(livro.nota || 0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const { addToast } = useToast();
  async function salvar(event) {
    event.preventDefault();
    if (!nota || salvando) return;
    setSalvando(true);
    setErro('');
    try {
      await avaliarLivro(livro.idLivro, nota);
      addToast('Avaliação salva. Obrigado por compartilhar!');
      onSaved(livro.idLivro, nota);
    } catch (error) {
      setErro(getErrorMessage(error, 'Não foi possível salvar sua avaliação. Tente novamente.'));
    } finally { setSalvando(false); }
  }
  return <form className="reading-rating" onSubmit={salvar} aria-label={`Avaliar ${livro.livTitulo}`}>
    <div className="reading-rating__icon" aria-hidden="true"><FaBookOpen /></div>
    <fieldset disabled={salvando}>
      <legend>{livro.livTitulo}</legend>
      <div className="reading-rating__stars">
        <div className="reading-rating__options">
          {[1, 2, 3, 4, 5].map(value => <label key={value} className={value <= nota ? 'is-selected' : ''}>
            <input type="radio" name={`nota-${livro.idLivro}`} value={value}
              aria-label={`${value} ${value === 1 ? 'estrela' : 'estrelas'}`}
              checked={nota === value} onChange={() => setNota(value)} />
            {value <= nota ? <FaStar aria-hidden="true" /> : <FaRegStar aria-hidden="true" />}
          </label>)}
        </div>
        <span>{nota ? `${nota} de 5` : 'Selecione sua nota'}</span>
      </div>
    </fieldset>
    <LoadingButton className="btn-primary" type="submit" loading={salvando}
      disabled={!nota || nota === livro.nota} loadingText="Salvando...">
      {livro.nota ? 'Atualizar avaliação' : 'Salvar avaliação'}
    </LoadingButton>
    {erro && <p role="alert">{erro}</p>}
  </form>;
}

function PainelRecomendacoes({ notifications }) {
  const { addToast } = useToast();
  const [itens, setItens] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [erroAvaliacoes, setErroAvaliacoes] = useState('');
  const [adiado, setAdiado] = useState(false);
  const [solicitando, setSolicitando] = useState({});
  const [solicitados, setSolicitados] = useState({});
  const sequence = useRef(0);
  const rodada = useRef(0);
  const pendentes = useRef(new Set());
  const trilho = useRef(null);
  const [navegacao, setNavegacao] = useState({ anterior: false, proximo: false });
  const [detalheLivro, setDetalheLivro] = useState(null);

  const atualizarNavegacao = useCallback(() => {
    const element = trilho.current;
    if (!element) return;
    setNavegacao({
      anterior: element.scrollLeft > 1,
      proximo: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    if (trilho.current) trilho.current.scrollLeft = 0;
    atualizarNavegacao();
    window.addEventListener('resize', atualizarNavegacao);
    return () => window.removeEventListener('resize', atualizarNavegacao);
  }, [itens, atualizarNavegacao]);

  function moverCarrossel(direcao) {
    const element = trilho.current;
    const primeiro = element?.firstElementChild;
    if (!primeiro) return;
    const distancia = primeiro.getBoundingClientRect().width +
      parseFloat(window.getComputedStyle(element).columnGap || '0');
    element.scrollBy({ left: direcao * distancia, behavior: 'smooth' });
  }

  const carregar = useCallback(async (renovar = false) => {
    const request = ++sequence.current;
    const proximaRodada = rodada.current + (renovar ? 1 : 0);
    setLoading(true);
    setErro('');
    setErroAvaliacoes('');
    try {
      const painel = await getPainelRecomendacoes(proximaRodada);
      if (sequence.current !== request) return;
      rodada.current = proximaRodada;
      setItens(painel.itens || []);
      setAvaliacoes(painel.avaliacoes || []);
    } catch (error) {
      if (sequence.current !== request) return;
      const mensagem = getErrorMessage(error, 'Não foi possível carregar recomendações e avaliações. Verifique sua conexão e tente novamente.');
      setErro(`Não foi possível carregar as sugestões: ${mensagem}`);
      setErroAvaliacoes(`Não foi possível carregar suas avaliações: ${mensagem}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
    return () => { sequence.current += 1; };
  }, [carregar]);

  async function solicitar(book) {
    const id = book.idLivro;
    if (pendentes.current.has(id) || solicitados[id]) return;
    pendentes.current.add(id);
    setSolicitando(previous => ({ ...previous, [id]: true }));
    try {
      await solicitarLivro({ idLivro: id });
      setSolicitados(previous => ({ ...previous, [id]: 'pendente' }));
      addToast('Solicitação enviada! Aguarde a aprovação.');
    } catch (error) {
      addToast(getErrorMessage(error, 'Não foi possível solicitar o livro.'), 'error');
    } finally {
      pendentes.current.delete(id);
      setSolicitando(previous => ({ ...previous, [id]: false }));
    }
  }

  function avaliacaoSalva(id, nota) {
    setAvaliacoes(previous => previous.map(livro => livro.idLivro === id ? { ...livro, nota } : livro));
    rodada.current = 0;
    carregar();
  }
  const semNota = avaliacoes.filter(livro => !livro.nota);
  const comNota = avaliacoes.filter(livro => livro.nota);

  return <><section className="reading-suggestions" aria-labelledby="reading-suggestions-title">
    <div className="user-section-card__header">
      <div><h2 id="reading-suggestions-title">Para sua próxima leitura</h2>
        <p>Sugestões a partir das suas leituras, avaliações e interesses em comum.</p></div>
      <LoadingButton
        className="reading-suggestions__refresh"
        onClick={() => carregar(true)}
        loading={loading}
        ariaLabel="Atualizar sugestões de leitura"
        loadingText={<><RefreshCw size={16} className="reading-suggestions__refresh-spinner" aria-hidden="true" /><span>Atualizando...</span></>}
      >
        <RefreshCw size={16} aria-hidden="true" />
        <span>Atualizar sugestões</span>
      </LoadingButton>
    </div>
    {erro && <p role="alert">{erro} Use “Atualizar sugestões” para tentar novamente.</p>}
    {loading && <p role="status">Buscando novas leituras...</p>}
    {!loading && !erro && !itens.length && <p className="user-empty-state">
      Não há novas sugestões disponíveis agora. Explore a biblioteca ou volte mais tarde.
    </p>}
    {!erro && !!itens.length && <div className="reading-suggestions__carousel">
      <div className="reading-suggestions__controls" aria-label="Navegação das sugestões">
        <button type="button" className="btn-secondary" aria-label="Sugestão anterior"
          disabled={!navegacao.anterior} onClick={() => moverCarrossel(-1)}>
          <FaChevronLeft aria-hidden="true" />
        </button>
        <button type="button" className="btn-secondary" aria-label="Próxima sugestão"
          disabled={!navegacao.proximo} onClick={() => moverCarrossel(1)}>
          <FaChevronRight aria-hidden="true" />
        </button>
      </div>
      <div className="reading-suggestions__track" ref={trilho} onScroll={atualizarNavegacao}
        role="region" aria-roledescription="carrossel" aria-label="Livros recomendados" tabIndex={0}>
        {itens.map(({ livro, motivo }) => {
          const disponiveis = Number(livro.disponiveis ?? livro.livrosDisponiveis ?? 0);
          const podeSolicitar = livro.livAtivo !== false && disponiveis > 0;
          const solicitado = solicitados[livro.idLivro];
          const capa = livro.livCapaURL || livro.capa || "/placeholder.png";
          return <article key={livro.idLivro} className="reading-suggestions__item">
            <div className="reading-suggestions__compact-card">
              <button type="button" className="reading-suggestions__cover-button" onClick={() => setDetalheLivro(livro)} aria-label={`Ver detalhes de ${livro.livTitulo}`}>
                <img src={capa} alt={`Capa de ${livro.livTitulo}`} loading="lazy" onError={e => { e.currentTarget.src = "/placeholder.png"; }}/>
                <span className={`reading-suggestions__availability ${podeSolicitar ? "is-available" : ""}`}>{podeSolicitar ? "Disponível" : "Indisponível"}</span>
              </button>
              <div className="reading-suggestions__compact-body">
                <button type="button" className="reading-suggestions__book-title" onClick={() => setDetalheLivro(livro)}>{livro.livTitulo}</button>
                <p className="reading-suggestions__book-author">{livro.livAutor || "Autor não informado"}</p>
                <p className="reading-suggestions__compact-meta">{disponiveis > 0 ? `${disponiveis} ${disponiveis === 1 ? "exemplar disponível" : "exemplares disponíveis"}` : "Sem exemplares disponíveis"}</p>
                <button type="button" className="reading-suggestions__request" onClick={() => solicitar(livro)}
                  disabled={!podeSolicitar || !!solicitado || !!solicitando[livro.idLivro]}>
                  <BookOpen size={15} aria-hidden="true"/>
                  {solicitando[livro.idLivro] ? "Enviando..." : solicitado ? "Solicitado" : "Solicitar empréstimo"}
                </button>
              </div>
            </div>
            <p className="reading-suggestions__reason">{motivo}</p>
          </article>;
        })}
      </div>
    </div>}
    {detalheLivro && <div className="reading-suggestions__modal-backdrop" role="presentation" onMouseDown={e => { if(e.target === e.currentTarget) setDetalheLivro(null); }}>
      <div role="dialog" aria-modal="true" aria-label={`Detalhes de ${detalheLivro.livTitulo}`} className="reading-suggestions__modal">
        <div className="reading-suggestions__modal-header"><h3>Informações do livro</h3><button type="button" onClick={() => setDetalheLivro(null)} aria-label="Fechar detalhes">×</button></div>
        <div className="reading-suggestions__modal-info">
          <img src={detalheLivro.livCapaURL || detalheLivro.capa || "/placeholder.png"} alt={`Capa de ${detalheLivro.livTitulo}`}/>
          <div><h4>{detalheLivro.livTitulo}</h4><p>{detalheLivro.livAutor || "Autor não informado"}</p>
            <p>{detalheLivro.livDescricao || "Descrição não informada para este livro."}</p>
            <p><strong>Gênero:</strong> {detalheLivro.livGenero || "Não informado"}</p>
            <p><strong>Exemplares disponíveis:</strong> {Number(detalheLivro.disponiveis ?? detalheLivro.livrosDisponiveis ?? 0)}</p>
            <button type="button" className="reading-suggestions__request" disabled={Number(detalheLivro.disponiveis ?? detalheLivro.livrosDisponiveis ?? 0) <= 0 || !!solicitados[detalheLivro.idLivro] || !!solicitando[detalheLivro.idLivro]}
              onClick={() => solicitar(detalheLivro)}><BookOpen size={15}/> {solicitados[detalheLivro.idLivro] ? "Solicitado" : "Solicitar empréstimo"}</button>
          </div>
        </div>
      </div>
    </div>}
    {erroAvaliacoes && <p role="alert">{erroAvaliacoes} Use “Atualizar sugestões” para tentar novamente.</p>}
    </section>
    <div className="user-dashboard-bottom-grid">
    {!!avaliacoes.length && <section className="user-section-card reading-feedback" aria-labelledby="reading-feedback-title">
      <div className="user-section-card__header">
        <div className="reading-feedback__heading">
          <span className="reading-feedback__icon" aria-hidden="true"><FaStar /></span>
          <div><h3 id="reading-feedback-title">O que achou das suas leituras?</h3>
            <p>Avaliar é opcional. Suas estrelas ajudam a melhorar as sugestões.</p></div>
        </div>
        {!!semNota.length && <button type="button" className="btn-secondary" onClick={() => setAdiado(!adiado)}>
          {adiado ? 'Avaliar livros devolvidos' : 'Agora não'}
        </button>}
      </div>
      {!adiado && semNota.slice(0, 3).map(livro => <AvaliacaoLivro key={livro.idLivro} livro={livro} onSaved={avaliacaoSalva} />)}
      {!adiado && semNota.length > 3 && <p>Mostrando as 3 devoluções mais recentes sem avaliação.</p>}
      {!!comNota.length && <details className="reading-feedback__history"><summary>Minhas avaliações ({comNota.length})</summary>
        {comNota.map(livro => <AvaliacaoLivro key={livro.idLivro} livro={livro} onSaved={avaliacaoSalva} />)}
      </details>}
    </section>}
    {notifications}
    </div>
  </>;
}

export default function Recomendacoes({ notifications }) {
  const { user } = useAuth();
  // Recomendações continuam exclusivas de Alunos; Comunidade mantém notificações.
  return user?.tipo === 'Aluno'
    ? <PainelRecomendacoes key={user.email || user.id} notifications={notifications}/>
    : <div className="user-dashboard-bottom-grid user-dashboard-bottom-grid--single">{notifications}</div>;
}
