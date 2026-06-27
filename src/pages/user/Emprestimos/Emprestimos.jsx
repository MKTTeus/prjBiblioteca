import React, { useEffect, useState } from "react";
import { getEmprestimos } from "../../../services/api";
import { formatarData } from "../../../utils/masks";
import { FiClock, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import "../UserArea.css";
import "./Emprestimos.css";

const statusLabelMap = {
  pendente: "Pendente",
  ativo: "Ativo",
  atrasado: "Atrasado",
  devolvido: "Devolvido",
};

/**
 * Replica a mesma lógica do admin (utils.js > getStatusEmprestimo):
 * ignora o movStatus do banco e recalcula pelo empLiv_DataPrevistaDevolucao.
 */
function resolverStatus(loan) {
  // Devolvido é definitivo
  if (loan.empLiv_Status === "Devolvido") return "devolvido";

  // Pendente: sem data prevista ainda
  if (
    loan.movStatus === "Pendente" ||
    loan.movTipo === "SOLICITACAO" ||
    loan.status === "pendente"
  ) return "pendente";

  // Calcular atraso pela data prevista (igual ao admin)
  if (loan.empLiv_DataPrevistaDevolucao) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const prevista = new Date(loan.empLiv_DataPrevistaDevolucao);
    prevista.setHours(0, 0, 0, 0);
    if (prevista < hoje) return "atrasado";
  }

  // Fallback: usar o status que veio do backend
  return loan.status || "ativo";
}

export default function Emprestimos() {
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLoans() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getEmprestimos();
        setLoans(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao carregar empréstimos:", err);
        setLoans([]);
        setError("Erro ao carregar seus empréstimos. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchLoans();
  }, []);

  // Aplicar a mesma lógica de status que o admin usa
  const loansComStatus = loans.map((loan) => ({
    ...loan,
    _statusResolvido: resolverStatus(loan),
  }));

  const pendentes = loansComStatus.filter((l) => l._statusResolvido === "pendente");
  const ativos    = loansComStatus.filter((l) => l._statusResolvido === "ativo");
  const atrasados = loansComStatus.filter((l) => l._statusResolvido === "atrasado");

  const renderLoanList = (items, emptyMessage) => {
    if (isLoading) return <div className="user-empty-state">Carregando empréstimos...</div>;
    if (error)     return <div className="user-empty-state">{error}</div>;
    if (items.length === 0) return <div className="user-empty-state">{emptyMessage}</div>;

    return (
      <div className="user-loans-list">
        {items.map((loan) => (
          <article className="user-loan-item" key={loan.idEmprestimo ?? loan.id}>
            <div className="user-loan-item__top">
              <div>
                <h4>{loan.titulo || "Livro desconhecido"}</h4>
                <small>{loan.codigo || "Sem código"}</small>
              </div>
              <span className={`status-badge ${loan._statusResolvido}`}>
                {statusLabelMap[loan._statusResolvido] || loan._statusResolvido}
              </span>
            </div>
            <p>Data do registro: {loan.dataEmprestimo ? formatarData(loan.dataEmprestimo) : "Não disponível"}</p>
            <p>Prazo: {loan.empLiv_DataPrevistaDevolucao || loan.dataDevolucao ? formatarData(loan.empLiv_DataPrevistaDevolucao || loan.dataDevolucao) : "Não disponível"}</p>
            <p>Renovações: {loan.renovacoes ?? 0}</p>
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
          <p>Acompanhe solicitações pendentes e empréstimos ativos.</p>
        </div>
      </section>

      {!isLoading && !error && pendentes.length > 0 && (
        <div className="user-loans-pending-banner">
          <FiClock className="user-loans-pending-banner__icon" />
          <span>
            Você tem <strong>{pendentes.length}</strong> solicitação{pendentes.length > 1 ? "ões" : ""} aguardando aprovação da biblioteca.
          </span>
        </div>
      )}

      <section className="user-loans-grid">
        <div className="user-section-card user-loans-column">
          <div className="user-section-card__header user-section-card__header--pendente">
            <FiClock className="user-section-card__header-icon" />
            <h3>Pendentes</h3>
            {!isLoading && pendentes.length > 0 && (
              <span className="user-section-count user-section-count--pendente">{pendentes.length}</span>
            )}
          </div>
          {renderLoanList(pendentes, "Nenhuma solicitação pendente no momento.")}
        </div>

        <div className="user-section-card user-loans-column">
          <div className="user-section-card__header user-section-card__header--ativo">
            <FiCheckCircle className="user-section-card__header-icon" />
            <h3>Ativos</h3>
            {!isLoading && ativos.length > 0 && (
              <span className="user-section-count user-section-count--ativo">{ativos.length}</span>
            )}
          </div>
          {renderLoanList(ativos, "Você não possui empréstimos ativos no momento.")}
        </div>

        <div className="user-section-card user-loans-column">
          <div className="user-section-card__header user-section-card__header--atrasado">
            <FiAlertCircle className="user-section-card__header-icon" />
            <h3>Atrasados</h3>
            {!isLoading && atrasados.length > 0 && (
              <span className="user-section-count user-section-count--atrasado">{atrasados.length}</span>
            )}
          </div>
          {renderLoanList(atrasados, "Você não possui empréstimos atrasados.")}
        </div>
      </section>
    </div>
  );
}