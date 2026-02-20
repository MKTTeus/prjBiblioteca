import "../styles/Dashboard.css";
import {
  FaBook,
  FaUsers,
  FaExchangeAlt,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlus,
  FaUndo,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDashboardStats } from "../services/api";





export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLivros: 0,
    totalUsuarios: 0,
    emprestimosAtivos: 0,
    devolucoesPendentes: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error("Erro ao carregar estatísticas do dashboard:", err);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="dashboard">
      <div className="header-dashboard">
        <h1>Bem-vindo ao Sistema de Biblioteca</h1>
        <p>
          Gerencie o acervo, empréstimos e cadastros da biblioteca escolar de forma simples e eficiente.
        </p>
      </div>

       <div className="cards">
        {/* Card Total de Livros - clicável para ir para /livros */}
        <NavLink to="/livros" className="card card-link">
          <div className="card-header">
            <span>Total de Livros</span>
            <div className="icon blue">
              <FaBook />
            </div>
          </div>
          <h2>{stats.totalLivros}</h2>
          <small className="positive">Clique para ver os livros</small>
        </NavLink>

        {/* Alunos Cadastrados */}
        <div className="card">
          <div className="card-header">
            <span>Alunos Cadastrados</span>
            <div className="icon green">
              <FaUsers />
            </div>
          </div>
          <h2>{stats.totalUsuarios}</h2>
          <small className="positive">Dados em tempo real</small>
        </div>

        {/* Empréstimos Ativos */}
        <div className="card">
          <div className="card-header">
            <span>Empréstimos Ativos</span>
            <div className="icon orange">
              <FaExchangeAlt />
            </div>
          </div>
          <h2>{stats.emprestimosAtivos}</h2>
          <small>Em andamento</small>
        </div>

        {/* Devoluções Pendentes */}
        <div className="card">
          <div className="card-header">
            <span>Devoluções Pendentes</span>
            <div className="icon red">
              <FaClock />
            </div>
          </div>
          <h2>{stats.devolucoesPendentes}</h2>
          <small className="danger">Acompanhe os atrasos</small>
        </div>
      </div>

        <div className="notifications">
          <div className="notifications-header">
            <div>
              <h3>Notificações e Avisos</h3>
              <p>Atualizações recentes do sistema</p>
            </div>
            <span className="badge">3 novas</span>
          </div>

          <div className="notification warning">
            <div className="notification-content">
              <div className="notification-icon warning-icon">
                <FaExclamationTriangle />
              </div>
              <div>
                <strong>3 livros em atraso</strong>
                <p>Alunos com devoluções pendentes há mais de 7 dias</p>
                <small>2 horas atrás</small>
              </div>
            </div>
            <button>Ver</button>
          </div>

          <div className="notification info">
            <div className="notification-content">
              <div className="notification-icon info-icon">
                <FaClock />
              </div>
              <div>
                <strong>5 reservas aguardando</strong>
                <p>Livros disponíveis para retirada</p>
                <small>4 horas atrás</small>
              </div>
            </div>
            <button>Ver</button>
          </div>

          <div className="notification success">
            <div className="notification-content">
              <div className="notification-icon success-icon">
                <FaCheckCircle />
              </div>
              <div>
                <strong>15 devoluções hoje</strong>
                <p>Meta diária alcançada</p>
                <small>6 horas atrás</small>
              </div>
            </div>
            <button>Ver</button>
          </div>

          <button className="view-all">Ver todas as notificações</button>
        </div>


         <div className="quick-actions">
          <p>Ações Rápidas</p>

          <div className="actions-container">
            <button className="action-btn red">
              <FaPlus />
              Novo Empréstimo
            </button>

            <NavLink to="/livros" className={({ isActive }) => (isActive ? "active" : undefined)}  >
              <button className="action-btn blue">
                <FaBook />
                Cadastrar Livro
              </button>
            </NavLink>

            <button className="action-btn green">
              <FaUndo />
              Processar Devolução
            </button>
          </div>
        </div>

    </div>
  );
}