import "./Dashboard.css";
import {
  FaBook,
  FaUsers,
  FaExchangeAlt,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlus,
} from "react-icons/fa";
import { PiStudentFill } from "react-icons/pi";
import { NavLink } from "react-router-dom";
import { RiUserCommunityFill } from "react-icons/ri";
import { useEffect, useState } from "react";
import { getDashboardStats } from "../../../services/api";

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
          Gerencie o acervo, empréstimos e cadastros da biblioteca escolar de forma
          simples e eficiente.
        </p>
      </div>

      <div className="cards">
        <NavLink to="/admin/livros" className="card card-link">
          <div className="card-header">
            <span>Total de Livros</span>
            <div className="icon blue">
              <FaBook />
            </div>
          </div>
          <h2>{stats.totalLivros}</h2>
          <small className="positive">Clique para ver os livros</small>
        </NavLink>

        <NavLink to="/admin/alunos" className="card card-link">
          <div className="card-header">
            <span>Total de Usuários</span>
            <div className="icon green">
              <FaUsers />
            </div>
          </div>
          <h2>{stats.totalUsuarios}</h2>
          <small className="positive">Clique para ver os alunos</small>
        </NavLink>

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

      <div className="notifications">
        <div className="notifications-header">
          <div>
            <h3>Notificações e Avisos</h3>
            <p>Atualizações recentes do sistema</p>
          </div>
          <span className="notifications-badge">
            {stats.atrasados + stats.reservados + stats.devolucoesHoje} novas
          </span>
        </div>

        {stats.atrasados > 0 && (
          <div className="dashboard-notification dashboard-notification--warning">
            <div className="dashboard-notification__content">
              <div className="dashboard-notification__icon dashboard-notification__icon--warning">
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

        {stats.reservados > 0 && (
          <div className="dashboard-notification dashboard-notification--info">
            <div className="dashboard-notification__content">
              <div className="dashboard-notification__icon dashboard-notification__icon--info">
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

        {stats.devolucoesHoje > 0 && (
          <div className="dashboard-notification dashboard-notification--success">
            <div className="dashboard-notification__content">
              <div className="dashboard-notification__icon dashboard-notification__icon--success">
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

        {stats.atrasados === 0 && stats.reservados === 0 && stats.devolucoesHoje === 0 && (
          <p style={{ padding: "10px" }}>Sem notificações no momento</p>
        )}
      </div>

      <div className="quick-actions">
        <p>Ações Rápidas</p>

        <div className="actions-container">
          <NavLink
            to="/admin/emprestimos"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <button className="action-btn red">
              <FaPlus />
              Novo Empréstimo
            </button>
          </NavLink>

          <NavLink
            to="/admin/livros"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <button className="action-btn blue">
              <FaBook />
              Cadastrar Livro
            </button>
          </NavLink>

          <NavLink
            to="/admin/alunos"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <button className="action-btn green">
              <PiStudentFill />
              Cadastrar Aluno
            </button>
          </NavLink>

          <NavLink
            to="/admin/comunidade"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <button className="action-btn orange">
              <RiUserCommunityFill />
              Cadastrar Comunidade
            </button>
          </NavLink>
        </div>
      </div>
    </div>
  );
}
