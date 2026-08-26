import React, { useEffect, useMemo, useState } from "react";
import {
  FiUser,
  FiUsers,
  FiArrowLeft,
  FiCheckCircle,
  FiTrash2,
} from "react-icons/fi";
import BookCard from "../../../components/BookCard/BookCard";
import SearchBar from "../../../components/SearchBar/SearchBar";
import { useToast } from "../../../contexts/ToastContext";
import { useAuth } from "../../../contexts/AuthContext";
import { getBooks, getTurmasProfessor, criarEmprestimoProfessor } from "../../../services/api";
import { getErrorMessage } from "../../../utils/apiError";
import "../../user/UserArea.css";
import "./NovoEmprestimo.css";

const OUTRA_TURMA = "__outra__";

export default function NovoEmprestimo({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [finalidade, setFinalidade] = useState(null); // "PESSOAL" | "TURMA"

  const [turmas, setTurmas] = useState([]);
  const [turmaSelecionadaKey, setTurmaSelecionadaKey] = useState("");
  const [serieManual, setSerieManual] = useState("");
  const [turmaManual, setTurmaManual] = useState("");
  const [turmaConfirmada, setTurmaConfirmada] = useState(false);

  const [search, setSearch] = useState("");
  const [books, setBooks] = useState([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [pendingQty, setPendingQty] = useState({}); // idLivro -> quantidade selecionada antes de adicionar

  const [cart, setCart] = useState({}); // idLivro -> { titulo, quantidade, disponiveis }
  const [enviando, setEnviando] = useState(false);
  const [resumoFinal, setResumoFinal] = useState(null);

  useEffect(() => {
    if (finalidade === "TURMA" && turmas.length === 0) {
      getTurmasProfessor()
        .then((data) => setTurmas(Array.isArray(data) ? data : []))
        .catch(() => setTurmas([]));
    }
  }, [finalidade, turmas.length]);

  useEffect(() => {
    let cancelado = false;
    async function buscar() {
      setIsLoadingBooks(true);
      try {
        const params = {};
        if (search.trim()) params.q = search.trim();
        const data = await getBooks(params);
        if (!cancelado) setBooks(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelado) setBooks([]);
      } finally {
        if (!cancelado) setIsLoadingBooks(false);
      }
    }
    // Só busca livros depois que a finalidade (e a turma, se aplicável)
    // já foram definidas — evita montar o carrinho antes de saber para
    // quem é o empréstimo.
    if (finalidade === "PESSOAL" || (finalidade === "TURMA" && turmaConfirmada)) {
      buscar();
    }
    return () => { cancelado = true; };
  }, [search, finalidade, turmaConfirmada]);

  const totalExemplaresCarrinho = useMemo(
    () => Object.values(cart).reduce((soma, item) => soma + item.quantidade, 0),
    [cart]
  );

  const handlePendingQtyChange = (idLivro, valor) => {
    setPendingQty((prev) => ({ ...prev, [idLivro]: valor }));
  };

  const handleAddToCart = (book, quantidade) => {
    const idLivro = book.idLivro ?? book.id;
    const disponiveis = Number(book.disponiveis ?? 0);
    setCart((prev) => {
      const atual = prev[idLivro]?.quantidade || 0;
      const novaQuantidade = Math.min(disponiveis, atual + quantidade);
      return {
        ...prev,
        [idLivro]: {
          idLivro,
          titulo: book.livTitulo || book.titulo || "Livro",
          quantidade: novaQuantidade,
          disponiveis,
        },
      };
    });
    setPendingQty((prev) => ({ ...prev, [idLivro]: 0 }));
    addToast(`${quantidade}x "${book.livTitulo || book.titulo}" adicionado ao carrinho`, "success");
  };

  const handleCartQtyChange = (idLivro, novaQuantidade) => {
    setCart((prev) => {
      const item = prev[idLivro];
      if (!item) return prev;
      if (novaQuantidade <= 0) {
        const { [idLivro]: _removido, ...resto } = prev;
        return resto;
      }
      const limitado = Math.min(item.disponiveis, novaQuantidade);
      return { ...prev, [idLivro]: { ...item, quantidade: limitado } };
    });
  };

  const handleRemoveFromCart = (idLivro) => {
    setCart((prev) => {
      const { [idLivro]: _removido, ...resto } = prev;
      return resto;
    });
  };

  const turmaOptions = useMemo(() => {
    return turmas.map((t) => ({
      key: `${t.serie}::${t.turma}`,
      label: [t.serie, t.turma].filter(Boolean).join(" - ") || "Sem identificação",
      serie: t.serie,
      turma: t.turma,
    }));
  }, [turmas]);

  const confirmarTurma = () => {
    if (turmaSelecionadaKey === OUTRA_TURMA) {
      if (!turmaManual.trim()) {
        addToast("Informe a turma.", "error");
        return;
      }
      setTurmaConfirmada(true);
      return;
    }
    const opcao = turmaOptions.find((o) => o.key === turmaSelecionadaKey);
    if (!opcao) {
      addToast("Selecione uma turma.", "error");
      return;
    }
    setSerieManual(opcao.serie || "");
    setTurmaManual(opcao.turma || "");
    setTurmaConfirmada(true);
  };

  const resetFluxo = () => {
    setFinalidade(null);
    setTurmaSelecionadaKey("");
    setSerieManual("");
    setTurmaManual("");
    setTurmaConfirmada(false);
    setCart({});
    setPendingQty({});
    setResumoFinal(null);
    setSearch("");
  };

  const handleConfirmarEmprestimo = async () => {
    if (totalExemplaresCarrinho === 0) {
      addToast("Adicione ao menos um livro ao carrinho.", "error");
      return;
    }
    setEnviando(true);
    try {
      const payload = {
        finalidade,
        turma: finalidade === "TURMA" ? turmaManual.trim() : null,
        serie: finalidade === "TURMA" ? serieManual.trim() || null : null,
        itens: Object.values(cart).map((item) => ({
          idLivro: item.idLivro,
          quantidade: item.quantidade,
        })),
      };
      const resultado = await criarEmprestimoProfessor(payload);
      setResumoFinal(resultado);
      setCart({});
      addToast("Solicitação enviada. Aguarde a aprovação do administrador.", "success");
    } catch (err) {
      addToast(getErrorMessage(err, "Erro ao criar empréstimo"), "error");
      // Se a disponibilidade mudou entre a montagem do carrinho e a
      // confirmação, atualiza a lista para refletir o estoque real.
      if (err?.status === 409) {
        try {
          const data = await getBooks(search.trim() ? { q: search.trim() } : {});
          setBooks(Array.isArray(data) ? data : []);
        } catch { /* silencioso */ }
      }
    } finally {
      setEnviando(false);
    }
  };

  // ── Tela de sucesso ────────────────────────────────────────────────
  if (resumoFinal) {
    return (
      <div className="user-page page-shell professor-novo-emprestimo">
        <section className="user-section-card professor-sucesso">
          <FiCheckCircle className="professor-sucesso__icon" />
          <h2>Solicitação enviada com sucesso</h2>
          <p>O empréstimo ficará disponível após a aprovação do administrador e o registro da retirada.</p>
          <dl>
            <div>
              <dt>Professor</dt>
              <dd>{user?.nome || "-"}</dd>
            </div>
            <div>
              <dt>Finalidade</dt>
              <dd>{resumoFinal.finalidade === "TURMA" ? "Turma" : "Pessoal"}</dd>
            </div>
            {resumoFinal.finalidade === "TURMA" && (
              <div>
                <dt>Turma</dt>
                <dd>{[resumoFinal.serie, resumoFinal.turma].filter(Boolean).join(" - ")}</dd>
              </div>
            )}
            <div>
              <dt>Livros diferentes</dt>
              <dd>{resumoFinal.totalLivros}</dd>
            </div>
            <div>
              <dt>Total de exemplares solicitados</dt>
              <dd>{resumoFinal.totalExemplares}</dd>
            </div>
            <div>
              <dt>Data de devolução</dt>
              <dd>{resumoFinal.dataDevolucao}</dd>
            </div>
          </dl>
          <div className="professor-sucesso__acoes">
              <button type="button" className="professor-btn professor-btn--primary" onClick={resetFluxo}>
                Nova solicitação
              </button>
            <button
              type="button"
              className="professor-btn professor-btn--secondary"
              onClick={() => onNavigate && onNavigate("emprestimos")}
            >
              Ver meus empréstimos
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ── Passo 1: escolher finalidade ─────────────────────────────────────
  if (!finalidade) {
    return (
      <div className="user-page page-shell professor-novo-emprestimo">
        <section className="user-page__hero">
          <div className="user-page__hero-content">
            <h2>Novo empréstimo</h2>
            <p>Escolha para quem é este empréstimo.</p>
          </div>
        </section>

        <div className="professor-finalidade-grid">
          <button type="button" className="professor-finalidade-card" onClick={() => setFinalidade("PESSOAL")}>
            <FiUser />
            <h3>Para mim</h3>
            <p>Empréstimo pessoal do professor.</p>
          </button>
          <button type="button" className="professor-finalidade-card" onClick={() => setFinalidade("TURMA")}>
            <FiUsers />
            <h3>Para uma turma</h3>
            <p>Empréstimo vinculado a uma série/turma.</p>
          </button>
        </div>
      </div>
    );
  }

  // ── Passo 2 (só para TURMA): selecionar turma ───────────────────────
  if (finalidade === "TURMA" && !turmaConfirmada) {
    return (
      <div className="user-page page-shell professor-novo-emprestimo">
        <section className="user-page__hero">
          <div className="user-page__hero-content">
            <h2>Novo empréstimo — Turma</h2>
            <p>Selecione a série e a turma para este empréstimo.</p>
          </div>
        </section>

        <section className="user-section-card professor-turma-form">
          <button type="button" className="professor-link-voltar" onClick={() => setFinalidade(null)}>
            <FiArrowLeft /> Alterar finalidade
          </button>

          {turmaOptions.length > 0 && (
            <label className="professor-form-field">
              <span>Selecionar turma já cadastrada</span>
              <select
                value={turmaSelecionadaKey}
                onChange={(e) => setTurmaSelecionadaKey(e.target.value)}
              >
                <option value="">Selecione...</option>
                {turmaOptions.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
                <option value={OUTRA_TURMA}>Outra (digitar manualmente)</option>
              </select>
            </label>
          )}

          {(turmaOptions.length === 0 || turmaSelecionadaKey === OUTRA_TURMA) && (
            <>
              <label className="professor-form-field">
                <span>Série</span>
                <input
                  type="text"
                  value={serieManual}
                  onChange={(e) => setSerieManual(e.target.value)}
                  placeholder="Ex.: 2º Ano"
                />
              </label>
              <label className="professor-form-field">
                <span>Turma</span>
                <input
                  type="text"
                  value={turmaManual}
                  onChange={(e) => setTurmaManual(e.target.value)}
                  placeholder="Ex.: B"
                />
              </label>
            </>
          )}

          <button type="button" className="professor-btn professor-btn--primary" onClick={confirmarTurma}>
            Continuar
          </button>
        </section>
      </div>
    );
  }

  // ── Passo 3: pesquisar livros + carrinho ────────────────────────────
  return (
    <div className="user-page page-shell professor-novo-emprestimo">
      <section className="user-page__hero">
        <div className="user-page__hero-content">
          <h2>Novo empréstimo</h2>
          <p>
            {finalidade === "TURMA"
              ? `Para a turma ${[serieManual, turmaManual].filter(Boolean).join(" - ")}`
              : "Empréstimo pessoal"}
          </p>
        </div>
      </section>

      <button
        type="button"
        className="professor-link-voltar"
        onClick={() => (finalidade === "TURMA" ? setTurmaConfirmada(false) : setFinalidade(null))}
      >
        <FiArrowLeft /> {finalidade === "TURMA" ? "Alterar turma" : "Alterar finalidade"}
      </button>

      <div className="professor-emprestimo-layout">
        <div className="professor-emprestimo-livros">
          <section className="user-section-card professor-search-toolbar">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Buscar por título, autor ou ISBN..."
            />
          </section>

          {isLoadingBooks ? (
            <div className="user-empty-state">Carregando livros...</div>
          ) : books.length > 0 ? (
            <div className="shared-book-grid">
              {books.map((book) => {
                const idLivro = book.idLivro ?? book.id;
                return (
                  <BookCard
                    key={idLivro}
                    book={book}
                    genreName={book.livGenero}
                    cartMode
                    pendingQuantity={pendingQty[idLivro] || 0}
                    onPendingQuantityChange={(v) => handlePendingQtyChange(idLivro, v)}
                    onAddToCart={(qtd) => handleAddToCart(book, qtd)}
                    cartQuantity={cart[idLivro]?.quantidade || 0}
                  />
                );
              })}
            </div>
          ) : (
            <div className="user-empty-state">Nenhum livro encontrado.</div>
          )}
        </div>

        <aside className="professor-carrinho">
          <h3>Empréstimo</h3>
          {Object.keys(cart).length === 0 ? (
            <p className="professor-carrinho__vazio">Nenhum livro adicionado ainda.</p>
          ) : (
            <>
              <ul className="professor-carrinho__lista">
                {Object.values(cart).map((item) => (
                  <li key={item.idLivro} className="professor-carrinho__item">
                    <div className="professor-carrinho__item-info">
                      <strong>{item.titulo}</strong>
                      <span>Disponíveis: {item.disponiveis}</span>
                    </div>
                    <div className="professor-carrinho__item-controles">
                      <div className="shared-book-card__qty-row">
                        <button
                          type="button"
                          className="shared-book-card__qty-btn"
                          onClick={() => handleCartQtyChange(item.idLivro, item.quantidade - 1)}
                        >
                          -
                        </button>
                        <span className="shared-book-card__qty-value">{item.quantidade}</span>
                        <button
                          type="button"
                          className="shared-book-card__qty-btn"
                          onClick={() => handleCartQtyChange(item.idLivro, item.quantidade + 1)}
                          disabled={item.quantidade >= item.disponiveis}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="professor-carrinho__remover"
                        onClick={() => handleRemoveFromCart(item.idLivro)}
                        aria-label={`Remover ${item.titulo} do carrinho`}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="professor-carrinho__total">
                <span>Total de exemplares</span>
                <strong>{totalExemplaresCarrinho}</strong>
              </div>

              <button
                type="button"
                className="professor-btn professor-btn--primary professor-carrinho__confirmar"
                onClick={handleConfirmarEmprestimo}
                disabled={enviando}
              >
                {enviando ? "Confirmando..." : "Confirmar empréstimo"}
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}