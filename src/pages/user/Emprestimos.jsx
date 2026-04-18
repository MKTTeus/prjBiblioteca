import React, { useEffect, useState } from "react";
import { getEmprestimos } from "../../services/api";
import "./UserArea.css";

const statusLabelMap = {
  pendente: "Pendente",
  ativo: "Ativo",
  atrasado: "Atrasado",
  devolvido: "Devolvido",
};

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

  const atrasados = loans.filter((loan) => loan.status === "atrasado");
  const ativos = loans.filter((loan) => loan.status === "ativo");

  const renderLoanList = (items, emptyMessage) => {
    if (isLoading) {
      return <div className="user-empty-state">Carregando empréstimos...</div>;
    }

    if (error) {
      return <div className="user-empty-state">{error}</div>;
    }

    if (items.length === 0) {
      return <div className="user-empty-state">{emptyMessage}</div>;
    }

    return (
      <div className="user-loans-list">
        {items.map((loan) => (
          <article className="user-loan-item" key={loan.idEmprestimo ?? loan.id}>
            <div className="user-loan-item__top">
              <div>
                <h4>{loan.titulo || "Livro desconhecido"}</h4>
                <small>{loan.codigo || "Sem código"}</small>
              </div>

              <span className={`status-badge ${loan.status}`}>
                {statusLabelMap[loan.status] || loan.status}
              </span>
            </div>

            <p>Data do registro: {loan.dataEmprestimo || "Não disponível"}</p>
            <p>Prazo: {loan.dataDevolucao || "Não disponível"}</p>
            <p>Renovações: {loan.renovacoes ?? 0}</p>
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="user-page">
      <section className="user-page__hero">
        <h2>Meus empréstimos</h2>
        <p>Acompanhe reservas pendentes e empréstimos ativos com dados reais do banco.</p>
      </section>

      <section className="user-loans-grid">
        <div className="user-section-card user-loans-column">
          <div className="user-section-card__header">
            <h3>Atrasados</h3>
          </div>

          {renderLoanList(atrasados, "Você não possui empréstimos atrasados no momento.")}
        </div>

        <div className="user-section-card user-loans-column">
          <div className="user-section-card__header">
            <h3>Ativos</h3>
          </div>

          {renderLoanList(ativos, "Você não possui empréstimos ativos no momento.")}
        </div>
      </section>
    </div>
  );
}
