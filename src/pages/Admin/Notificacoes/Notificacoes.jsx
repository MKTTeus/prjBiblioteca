import React, { useEffect, useState } from "react";
import {
  FaClock,
  FaExclamationTriangle,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { getAdminNotifications } from "../../../services/api";
import "../../user/UserArea.css";
import "./Notificacoes.css";

function renderLoanItem(item, badgeLabel, variant) {
  return (
    <article
      className={`user-notification-item user-notification-item--${variant}`}
      key={`${item.id}-${item.userDocument}-${item.tombo}`}
    >
      <div className="user-notification-item__content">
        <div className={`user-notification-item__icon user-notification-item__icon--${variant}`}>
          {variant === "warning" ? <FaExclamationTriangle /> : <FaClock />}
        </div>

        <div className="user-notification-item__body">
          <div className="user-notification-item__top">
            <div>
              <h4>{item.bookTitle}</h4>
              <small>{item.tombo}</small>
            </div>
            <span className={`notification-badge ${variant}`}>{badgeLabel}</span>
          </div>

          <p>{item.userName}</p>
          <p>{item.userType}</p>
          <small>{item.userDocument}</small>
          <small>{item.telefone}</small>
        </div>
      </div>
    </article>
  );
}

export default function AdminNotificacoes() {
  const [atrasadosAlunos, setAtrasadosAlunos] = useState([]);
  const [atrasadosComunidade, setAtrasadosComunidade] = useState([]);
  const [recentes, setRecentes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openAlunos, setOpenAlunos] = useState(false);
  const [openComunidade, setOpenComunidade] = useState(false);
  const [openRecentes, setOpenRecentes] = useState(false);

  useEffect(() => {
    async function loadNotifications() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getAdminNotifications();
        setAtrasadosAlunos(Array.isArray(data.atrasadosAlunos) ? data.atrasadosAlunos : []);
        setAtrasadosComunidade(Array.isArray(data.atrasadosComunidade) ? data.atrasadosComunidade : []);
        setRecentes(Array.isArray(data.recentes) ? data.recentes : []);
      } catch (err) {
        console.error("Erro ao carregar notificações do admin:", err);
        setError("Erro ao carregar notificações. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    }

    loadNotifications();
  }, []);

  return (
    <div className="user-page admin-notifications-page">
      <section className="user-page__hero">
        <h2>Notificações do Admin</h2>
        <p>Veja os empréstimos em atraso e as retiradas recentes.</p>
      </section>

      <section className="user-section-card admin-notification-section">
        <button
          type="button"
          className="admin-section-toggle"
          onClick={() => setOpenAlunos((current) => !current)}
        >
          <div>
            <h3>Alunos com livros em atraso</h3>
            <p>{atrasadosAlunos.length} registro(s)</p>
          </div>
          <span>{openAlunos ? <FaChevronUp /> : <FaChevronDown />}</span>
        </button>

        <div className={`admin-section-content ${openAlunos ? "open" : "collapsed"}`}>
          {isLoading ? (
            <div className="user-empty-state">Carregando notificações...</div>
          ) : error ? (
            <div className="user-empty-state">{error}</div>
          ) : atrasadosAlunos.length > 0 ? (
            <div className="user-notifications-list">
              {atrasadosAlunos.map((item) => renderLoanItem(item, "warning", "atrasado"))}
            </div>
          ) : (
            <div className="user-empty-state">Nenhum empréstimo atrasado de aluno encontrado.</div>
          )}
        </div>
      </section>

      <section className="user-section-card admin-notification-section">
        <button
          type="button"
          className="admin-section-toggle"
          onClick={() => setOpenComunidade((current) => !current)}
        >
          <div>
            <h3>Comunidade com livros em atraso</h3>
            <p>{atrasadosComunidade.length} registro(s)</p>
          </div>
          <span>{openComunidade ? <FaChevronUp /> : <FaChevronDown />}</span>
        </button>

        <div className={`admin-section-content ${openComunidade ? "open" : "collapsed"}`}>
          {isLoading ? (
            <div className="user-empty-state">Carregando notificações...</div>
          ) : error ? (
            <div className="user-empty-state">{error}</div>
          ) : atrasadosComunidade.length > 0 ? (
            <div className="user-notifications-list">
              {atrasadosComunidade.map((item) => renderLoanItem(item, "warning", "atrasado"))}
            </div>
          ) : (
            <div className="user-empty-state">Nenhum empréstimo atrasado de comunidade encontrado.</div>
          )}
        </div>
      </section>

      <section className="user-section-card admin-notification-section">
        <button
          type="button"
          className="admin-section-toggle"
          onClick={() => setOpenRecentes((current) => !current)}
        >
          <div>
            <h3>Retiradas recentes (últimas 24h)</h3>
            <p>{recentes.length} registro(s)</p>
          </div>
          <span>{openRecentes ? <FaChevronUp /> : <FaChevronDown />}</span>
        </button>

        <div className={`admin-section-content ${openRecentes ? "open" : "collapsed"}`}>
          {isLoading ? (
            <div className="user-empty-state">Carregando notificações...</div>
          ) : error ? (
            <div className="user-empty-state">{error}</div>
          ) : recentes.length > 0 ? (
            <div className="user-notifications-list">
              {recentes.map((item) => renderLoanItem(item, "info", "recent"))}
            </div>
          ) : (
            <div className="user-empty-state">Nenhuma retirada recente encontrada.</div>
          )}
        </div>
      </section>
    </div>
  );
}
