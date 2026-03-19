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
  const [stats, setStats] = useState(null);
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

   if (!stats) {
    return <p>Carregando...</p>;
  }

  return (
    <div className="dashboard">
      <div className="header-dashboard">
        <h1>Bem-vindo ao Sistema de Biblioteca</h1>
        <p>
          Gerencie o acervo, empréstimos e cadastros da biblioteca escolar de forma simples e eficiente.
        </p>
      </div>

   <div className="cards">
    {/* Card Total de Livros */}
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
        {/* Card Total de Usuários  */}
        <NavLink to="/alunos" className="card card-link">
          <div className="card-header">
            <span>Total de Usuários</span>
            <div className="icon green">
              <FaUsers />
            </div>
          </div>
          <h2>{stats.totalUsuarios}</h2>
          <small className="positive">Clique para ver os Alunos</small>
        </NavLink>

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
          <h2>{stats.atrasados}</h2>
          <small className="danger">Acompanhe os atrasos</small>
        </div>
      </div>

              {/* NOTIFICAÇÕES */}
      <div className="notifications">
        <div className="notifications-header">
          <div>
            <h3>Notificações e Avisos</h3>
            <p>Atualizações recentes do sistema</p>
          </div>
          <span className="badge">
            {stats.atrasados + stats.reservados + stats.devolucoesHoje} novas
          </span>
        </div>

        {/* ATRASADOS */}
        {stats.atrasados > 0 && (
          <div className="notification warning">
            <div className="notification-content">
              <div className="notification-icon warning-icon">
                <FaExclamationTriangle />
              </div>
              <div>
                <strong>{stats.atrasados} livros em atraso</strong>
                <p>Alunos com devoluções atrasadas</p>
                <small>Atualizado agora</small>
              </div>
            </div>
          </div>
        )}

        {/* RESERVAS */}
        {stats.reservados > 0 && (
          <div className="notification info">
            <div className="notification-content">
              <div className="notification-icon info-icon">
                <FaClock />
              </div>
              <div>
                <strong>{stats.reservados} reservas aguardando</strong>
                <p>Livros disponíveis para retirada</p>
                <small>Atualizado agora</small>
              </div>
            </div>
          </div>
        )}

        {/* DEVOLUÇÕES */}
        {stats.devolucoesHoje > 0 && (
          <div className="notification success">
            <div className="notification-content">
              <div className="notification-icon success-icon">
                <FaCheckCircle />
              </div>
              <div>
                <strong>{stats.devolucoesHoje} devoluções hoje</strong>
                <p>Movimentação do dia</p>
                <small>Atualizado agora</small>
              </div>
            </div>
          </div>
        )}

        {/* SEM NOTIFICAÇÕES */}
        {stats.atrasados === 0 &&
          stats.reservados === 0 &&
          stats.devolucoesHoje === 0 && (
            <p style={{ padding: "10px" }}>
              Sem notificações no momento 👍
            </p>
          )}
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