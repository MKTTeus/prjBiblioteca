import React, { useEffect, useState } from "react";
import { getEmprestimos } from "../../../services/api";
import { FiClock, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { resolverStatus } from "../../../utils/loanStatus";
import "./Emprestimos.css";

const statusLabelMap = {
  pendente: "Pendente",
  aprovado: "Aprovado — aguarde retirada",
  ativo: "Ativo",
  atrasado: "Atrasado",
  devolvido: "Devolvido",
  expirado: "Expirado",
  negado: "Negado",
};

export default function Emprestimos() {
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    async function fetchLoans({ mostrarLoading }) {
      if (mostrarLoading) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const data = await getEmprestimos();
        if (cancelado) return;
        setLoans(Array.isArray(data) ? data : []);
        if (mostrarLoading) setError(null);
      } catch (err) {
        console.error("Erro ao carregar empréstimos:", err);
        if (!cancelado && mostrarLoading) {
          setLoans([]);
          setError("Erro ao carregar seus empréstimos. Tente novamente.");
        }
      } finally {
        if (mostrarLoading && !cancelado) setIsLoading(false);
      }
    }

    fetchLoans({ mostrarLoading: true });
    const interval = setInterval(() => fetchLoans({ mostrarLoading: false }), 10000);
    function aoFocar() {
      if (document.visibilityState === "visible") fetchLoans({ mostrarLoading: false });
    }
    document.addEventListener("visibilitychange", aoFocar);
    window.addEventListener("focus", aoFocar);

    return () => {
      cancelado = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", aoFocar);
      window.removeEventListener("focus", aoFocar);
    };
  }, []);

  // Aplicar a mesma lógica de status que o admin usa
  const loansComStatus = loans.map((loan) => ({
    ...loan,
    _statusResolvido: resolverStatus(loan),
  }));

  const pendentes = loansComStatus.filter(
    (l) => l._statusResolvido === "pendente" || l._statusResolvido === "aprovado"
  );
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
            <p>Data do registro: {loan.dataEmprestimo || "Não disponível"}</p>
            <p>Prazo: {loan.empLiv_DataPrevistaDevolucao || loan.dataDevolucao || "Não disponível"}</p>
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