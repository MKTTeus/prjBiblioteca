import React from "react";
import { mockLoans } from "./mockData";
import "./UserArea.css";

const statusLabelMap = {
  pendente: "Pendente",
  ativo: "Ativo",
};

export default function Emprestimos() {
  const pendentes = mockLoans.filter((loan) => loan.status === "pendente");
  const ativos = mockLoans.filter((loan) => loan.status === "ativo");

  const renderLoanList = (items, emptyMessage) => {
    if (items.length === 0) {
      return <div className="user-empty-state">{emptyMessage}</div>;
    }

    return (
      <div className="user-loans-list">
        {items.map((loan) => (
          <article className="user-loan-item" key={loan.id}>
            <div className="user-loan-item__top">
              <div>
                <h4>{loan.titulo}</h4>
                <small>{loan.codigo}</small>
              </div>

              <span className={`status-badge ${loan.status}`}>
                {statusLabelMap[loan.status] || loan.status}
              </span>
            </div>

            <p>Data do registro: {loan.dataEmprestimo}</p>
            <p>Prazo: {loan.dataDevolucao}</p>
            <p>Renovações: {loan.renovacoes}</p>
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="user-page">
      <section className="user-page__hero">
        <h2>Meus empréstimos</h2>
        <p>
          Acompanhe reservas pendentes e empréstimos ativos sem depender de backend.
        </p>
      </section>

      <section className="user-loans-grid">
        <div className="user-loans-column">
          <h3>Pendentes</h3>
          {renderLoanList(pendentes, "Você não possui reservas pendentes no momento.")}
        </div>

        <div className="user-loans-column">
          <h3>Ativos</h3>
          {renderLoanList(ativos, "Você não possui empréstimos ativos no momento.")}
        </div>
      </section>
    </div>
  );
}
