import React, { useEffect, useState } from "react";
import { FiClock, FiCheckCircle, FiAlertCircle, FiUser, FiUsers } from "react-icons/fi";
import Modal from "../../../components/Modal/Modal";
import { useToast } from "../../../contexts/ToastContext";
import { getEmprestimosProfessor, devolverEmprestimoProfessor } from "../../../services/api";
import { getErrorMessage } from "../../../utils/apiError";
import "../../user/UserArea.css";
import "./MeusEmprestimos.css";

const STATUS_LABEL = {
  Ativo: "Ativo",
  Atrasado: "Atrasado",
  Devolvido: "Devolvido",
};

const STATUS_CLASSE = {
  Ativo: "ativo",
  Atrasado: "atrasado",
  Devolvido: "devolvido",
};

export default function MeusEmprestimos() {
  const { addToast } = useToast();
  const [emprestimos, setEmprestimos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const [quantidadesDevolucao, setQuantidadesDevolucao] = useState({});
  const [devolvendo, setDevolvendo] = useState(false);

  async function carregar({ mostrarLoading } = { mostrarLoading: true }) {
    if (mostrarLoading) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const data = await getEmprestimosProfessor();
      setEmprestimos(Array.isArray(data) ? data : []);
    } catch (err) {
      if (mostrarLoading) {
        setError("Erro ao carregar seus empréstimos. Tente novamente.");
        setEmprestimos([]);
      }
    } finally {
      if (mostrarLoading) setIsLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    const interval = setInterval(() => carregar({ mostrarLoading: false }), 15000);
    return () => clearInterval(interval);
  }, []);

  const ativos = emprestimos.filter((e) => e.status === "Ativo");
  const atrasados = emprestimos.filter((e) => e.status === "Atrasado");
  const devolvidos = emprestimos.filter((e) => e.status === "Devolvido");

  const abrirDetalhes = (emprestimo) => {
    setSelecionado(emprestimo);
    const iniciais = {};
    emprestimo.livros.forEach((livro) => {
      iniciais[livro.idLivro] = 0;
    });
    setQuantidadesDevolucao(iniciais);
  };

  const fecharDetalhes = () => {
    setSelecionado(null);
    setQuantidadesDevolucao({});
  };

  const alterarQuantidadeDevolucao = (idLivro, valor, max) => {
    const limitado = Math.max(0, Math.min(max, valor));
    setQuantidadesDevolucao((prev) => ({ ...prev, [idLivro]: limitado }));
  };

  const confirmarDevolucao = async () => {
    if (!selecionado) return;
    const itens = Object.entries(quantidadesDevolucao)
      .filter(([, qtd]) => qtd > 0)
      .map(([idLivro, qtd]) => ({ idLivro: Number(idLivro), quantidade: qtd }));

    if (itens.length === 0) {
      addToast("Selecione ao menos um exemplar para devolver.", "error");
      return;
    }

    setDevolvendo(true);
    try {
      await devolverEmprestimoProfessor(selecionado.idMovimentacao, itens);
      addToast("Devolução registrada com sucesso.", "success");
      fecharDetalhes();
      carregar({ mostrarLoading: false });
    } catch (err) {
      addToast(getErrorMessage(err, "Erro ao registrar devolução"), "error");
    } finally {
      setDevolvendo(false);
    }
  };

  const renderLista = (items, mensagemVazia) => {
    if (isLoading) return <div className="user-empty-state">Carregando empréstimos...</div>;
    if (error) return <div className="user-empty-state">{error}</div>;
    if (items.length === 0) return <div className="user-empty-state">{mensagemVazia}</div>;

    return (
      <div className="user-loans-list">
        {items.map((emp) => (
          <article
            key={emp.idMovimentacao}
            className="user-loan-item professor-loan-item"
            onClick={() => abrirDetalhes(emp)}
          >
            <div className="user-loan-item__top">
              <div>
                <h4>
                  {emp.finalidade === "TURMA" ? <FiUsers /> : <FiUser />}{" "}
                  {emp.finalidade === "TURMA"
                    ? [emp.serie, emp.turma].filter(Boolean).join(" - ") || "Turma"
                    : "Empréstimo pessoal"}
                </h4>
                <small>Empréstimo #{emp.idMovimentacao}</small>
              </div>
              <span className={`status-badge ${STATUS_CLASSE[emp.status] || ""}`}>
                {STATUS_LABEL[emp.status] || emp.status}
              </span>
            </div>
            <p>Data do empréstimo: {emp.dataEmprestimo || "-"}</p>
            <p>Prazo: {emp.dataPrevistaDevolucao || "-"}</p>
            <p>
              {emp.totalLivros} livro(s) / {emp.totalExemplares} exemplar(es)
              {emp.totalDevolvidos > 0 ? ` — ${emp.totalDevolvidos} já devolvido(s)` : ""}
            </p>
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="user-page page-shell">
      <section className="user-page__hero">
        <div className="user-page__hero-content">
          <h2>Meus empréstimos</h2>
          <p>Acompanhe e devolva os livros retirados para você ou para suas turmas.</p>
        </div>
      </section>

      <section className="user-loans-grid">
        <div className="user-section-card user-loans-column">
          <div className="user-section-card__header user-section-card__header--ativo">
            <FiCheckCircle className="user-section-card__header-icon" />
            <h3>Ativos</h3>
            {!isLoading && ativos.length > 0 && (
              <span className="user-section-count user-section-count--ativo">{ativos.length}</span>
            )}
          </div>
          {renderLista(ativos, "Nenhum empréstimo ativo no momento.")}
        </div>

        <div className="user-section-card user-loans-column">
          <div className="user-section-card__header user-section-card__header--atrasado">
            <FiAlertCircle className="user-section-card__header-icon" />
            <h3>Atrasados</h3>
            {!isLoading && atrasados.length > 0 && (
              <span className="user-section-count user-section-count--atrasado">{atrasados.length}</span>
            )}
          </div>
          {renderLista(atrasados, "Nenhum empréstimo atrasado.")}
        </div>

        <div className="user-section-card user-loans-column">
          <div className="user-section-card__header user-section-card__header--pendente">
            <FiClock className="user-section-card__header-icon" />
            <h3>Devolvidos</h3>
            {!isLoading && devolvidos.length > 0 && (
              <span className="user-section-count user-section-count--pendente">{devolvidos.length}</span>
            )}
          </div>
          {renderLista(devolvidos, "Nenhum empréstimo devolvido ainda.")}
        </div>
      </section>

      <Modal show={!!selecionado} onClose={fecharDetalhes} className="professor-detalhe-modal">
        {selecionado && (
          <div className="professor-detalhe">
            <h3>Empréstimo #{selecionado.idMovimentacao}</h3>
            <p className="professor-detalhe__subtitulo">
              {selecionado.finalidade === "TURMA"
                ? `Turma: ${[selecionado.serie, selecionado.turma].filter(Boolean).join(" - ")}`
                : "Empréstimo pessoal"}
              {" · "}Prazo: {selecionado.dataPrevistaDevolucao || "-"}
            </p>

            <div className="professor-detalhe__lista">
              {selecionado.livros.map((livro) => (
                <div key={livro.idLivro} className="professor-detalhe__linha">
                  <div className="professor-detalhe__linha-info">
                    <strong>{livro.titulo}</strong>
                    <span>
                      {livro.ativos} ativo(s){livro.devolvidos > 0 ? ` · ${livro.devolvidos} devolvido(s)` : ""}
                    </span>
                  </div>
                  {livro.ativos > 0 && (
                    <div className="professor-detalhe__devolucao">
                      <span>Devolver:</span>
                      <div className="shared-book-card__qty-row">
                        <button
                          type="button"
                          className="shared-book-card__qty-btn"
                          onClick={() =>
                            alterarQuantidadeDevolucao(
                              livro.idLivro,
                              (quantidadesDevolucao[livro.idLivro] || 0) - 1,
                              livro.ativos
                            )
                          }
                        >
                          -
                        </button>
                        <span className="shared-book-card__qty-value">
                          {quantidadesDevolucao[livro.idLivro] || 0}
                        </span>
                        <button
                          type="button"
                          className="shared-book-card__qty-btn"
                          onClick={() =>
                            alterarQuantidadeDevolucao(
                              livro.idLivro,
                              (quantidadesDevolucao[livro.idLivro] || 0) + 1,
                              livro.ativos
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selecionado.status !== "Devolvido" && (
              <button
                type="button"
                className="professor-btn professor-btn--primary"
                onClick={confirmarDevolucao}
                disabled={devolvendo}
              >
                {devolvendo ? "Registrando..." : "Confirmar devolução"}
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}