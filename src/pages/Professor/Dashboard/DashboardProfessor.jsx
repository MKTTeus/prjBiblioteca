import React, { useEffect, useState } from "react";
import { FiPlusCircle, FiRepeat, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { useAuth } from "../../../contexts/AuthContext";
import { getEmprestimosProfessor } from "../../../services/api";
import "../../user/UserArea.css";
import "./DashboardProfessor.css";

export default function DashboardProfessor({ onNavigate }) {
  const { user } = useAuth();
  const [emprestimos, setEmprestimos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    getEmprestimosProfessor()
      .then((data) => { if (!cancelado) setEmprestimos(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelado) setEmprestimos([]); })
      .finally(() => { if (!cancelado) setIsLoading(false); });
    return () => { cancelado = true; };
  }, []);

  const ativos = emprestimos.filter((e) => e.status === "Ativo").length;
  const atrasados = emprestimos.filter((e) => e.status === "Atrasado").length;

  return (
    <div className="user-page page-shell">
      <section className="user-page__hero">
        <div className="user-page__hero-content">
          <h2>Olá, {user?.nome || "professor(a)"}!</h2>
          <p>Esta é a sua área na Biblioteca. Faça empréstimos para você ou para suas turmas.</p>
        </div>
      </section>

      <section className="professor-dashboard-stats">
        <div className="user-section-card professor-stat-card">
          <FiCheckCircle className="professor-stat-card__icon professor-stat-card__icon--ativo" />
          <div>
            <strong>{isLoading ? "-" : ativos}</strong>
            <span>Empréstimos ativos</span>
          </div>
        </div>
        <div className="user-section-card professor-stat-card">
          <FiAlertCircle className="professor-stat-card__icon professor-stat-card__icon--atrasado" />
          <div>
            <strong>{isLoading ? "-" : atrasados}</strong>
            <span>Empréstimos atrasados</span>
          </div>
        </div>
      </section>

      <section className="professor-dashboard-actions">
        <button
          type="button"
          className="user-section-card professor-dashboard-action"
          onClick={() => onNavigate && onNavigate("novo-emprestimo")}
        >
          <FiPlusCircle />
          <div>
            <h3>Novo empréstimo</h3>
            <p>Retire livros para você ou para uma turma.</p>
          </div>
        </button>
        <button
          type="button"
          className="user-section-card professor-dashboard-action"
          onClick={() => onNavigate && onNavigate("emprestimos")}
        >
          <FiRepeat />
          <div>
            <h3>Meus empréstimos</h3>
            <p>Acompanhe e devolva os livros retirados.</p>
          </div>
        </button>
      </section>
    </div>
  );
}