import React from "react";
import { FiBookOpen, FiBookmark, FiRepeat } from "react-icons/fi";
import { userDashboardSummary } from "./mockData";
import "./UserArea.css";

const cards = [
  {
    key: "total",
    title: "Total de livros",
    value: userDashboardSummary.totalLivros,
    description: "Quantidade de títulos disponíveis no acervo escolar.",
    icon: FiBookOpen,
  },
  {
    key: "available",
    title: "Livros disponíveis",
    value: userDashboardSummary.livrosDisponiveis,
    description: "Títulos com pelo menos um exemplar pronto para empréstimo.",
    icon: FiBookmark,
  },
  {
    key: "loans",
    title: "Meus empréstimos",
    value: userDashboardSummary.meusEmprestimos,
    description: "Reservas e empréstimos ativos vinculados ao seu perfil.",
    icon: FiRepeat,
  },
];

export default function DashboardHome() {
  return (
    <div className="user-page">
      <section className="user-page__hero">
        <h1>Área do usuário</h1>
        <p>
          Acompanhe seus empréstimos, consulte o acervo da biblioteca e veja os avisos
          mais recentes em um único lugar.
        </p>
      </section>

      <section className="user-page__grid">
        {cards.map(({ key, title, value, description, icon: Icon }) => (
          <article className="user-stat-card" key={key}>
            <div className="user-stat-card__header">
              <h3>{title}</h3>
              <span className="user-stat-card__icon">
                <Icon />
              </span>
            </div>

            <strong>{value}</strong>
            <p>{description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
