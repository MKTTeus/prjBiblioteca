import "../styles/Dashboard.css";
import { FaBook, FaUsers, FaExchangeAlt, FaClock, FaCheckCircle, FaExclamationTriangle, FaPlus, FaUndo } from "react-icons/fa";

export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="header-dashboard">
        <h1>Bem-vindo ao Sistema de Biblioteca</h1>
        <p>
          Gerencie o acervo, empréstimos e cadastros da biblioteca escolar de forma simples e eficiente.
        </p>
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-header">
            <span>Total de Livros</span>
            <div className="icon blue">
              <FaBook />
            </div>
          </div>
          <h2>2.847</h2>
          <small className="positive">+12 este mês</small>
        </div>

        <div className="card">
          <div className="card-header">
            <span>Alunos Cadastrados</span>
            <div className="icon green">
              <FaUsers />
            </div>
          </div>
          <h2>485</h2>
          <small className="positive">+8 novos</small>
        </div>

        <div className="card">
          <div className="card-header">
            <span>Empréstimos Ativos</span>
            <div className="icon orange">
              <FaExchangeAlt />
            </div>
          </div>
          <h2>127</h2>
          <small>15 hoje</small>
        </div>

        <div className="card">
          <div className="card-header">
            <span>Devoluções Pendentes</span>
            <div className="icon red">
              <FaClock />
            </div>
          </div>
          <h2>23</h2>
          <small className="danger">3 em atraso</small>
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

            <button className="action-btn blue">
              <FaBook />
              Cadastrar Livro
            </button>

            <button className="action-btn green">
              <FaUndo />
              Processar Devolução
            </button>
          </div>
        </div>


    </div>
  );
}
