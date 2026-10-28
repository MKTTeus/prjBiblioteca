import React, { useEffect, useRef, useState } from "react";
import {
  FaBell,
  FaBook,
  FaBookmark,
  FaCheckCircle,
  FaClock,
  FaExchangeAlt,
  FaExclamationTriangle,
} from "react-icons/fa";
import StatsCard from "../../../components/StatsCard/StatsCard";
import { resolverStatus } from "../../../utils/loanStatus";
import { getResumoAcervo, getEmprestimos } from "../../../services/api";
import "../UserArea.css";
import "./DashboardHome.css";
import Recomendacoes from "./Recomendacoes";
import { useAuth } from "../../../contexts/AuthContext";
import "./UserDashboardRedesign.css";

const notificationTypeMap = {
  info: {
    icon: <FaClock />,
    label: "Informação",
    tone: "info",
  },
  warning: {
    icon: <FaExclamationTriangle />,
    label: "Aviso",
    tone: "warning",
  },
  success: {
    icon: <FaCheckCircle />,
    label: "Atualização",
    tone: "success",
  },
};

export default function DashboardHome({ onViewAllNotifications, onNavigate }) {
  const { user } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [latestNotifications, setLatestNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [readNotifications, setReadNotifications] = useState(() => {
    const stored = localStorage.getItem('user_notifications_read');
    return stored ? JSON.parse(stored) : [];
  });
  const [stats, setStats] = useState({
    totalLivros: 0,
    livrosDisponiveis: 0,
    meusEmprestimos: 0,
  });
  const notificationsRef = useRef(null);

  const cards = [
    {
      key: "total",
      title: "Títulos no acervo",
      value: stats.totalLivros,
      description: "Com pelo menos um exemplar não desativado.",
      icon: <FaBook size={18} />,
      color: "blue",
    },
    {
      key: "available",
      title: "Livros disponíveis",
      value: stats.livrosDisponiveis,
      description: "Títulos com pelo menos um exemplar pronto para empréstimo.",
      icon: <FaBookmark size={18} />,
      color: "green",
    },
    {
      key: "loans",
      title: "Meus empréstimos",
      value: stats.meusEmprestimos,
      description: "Reservas e empréstimos ativos vinculados ao seu perfil.",
      icon: <FaExchangeAlt size={18} />,
      color: "orange",
    },
  ];

  const handleCardClick = (key) => {
    if (!onNavigate) return;
    const map = {
      total: "biblioteca",
      available: "biblioteca",
      loans: "emprestimos",
    };
    const page = map[key] || "dashboard";
    onNavigate(page);
  };

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [resumo, loans] = await Promise.all([getResumoAcervo(), getEmprestimos()]);

        const loanItems = Array.isArray(loans) ? loans : [];

        const loanItemsComStatus = loanItems.map((loan) => ({
          ...loan,
          _status: resolverStatus(loan),
        }));

        // Contar apenas empréstimos realmente ativos (ativo + atrasado)
        const emprestimosAtivos = loanItemsComStatus.filter(
          (l) => l._status === "ativo" || l._status === "atrasado"
        );

        const allNotifications = loanItemsComStatus
          .filter((loan) => loan.titulo && (loan._status === "ativo" || loan._status === "atrasado" || loan._status === "pendente"))
          .map((loan) => {
            const status = loan._status;
            const tone = status === "atrasado" ? "warning" : status === "ativo" ? "success" : "info";
            const label = status === "pendente" ? "Reserva pendente" : status === "atrasado" ? "Atrasado" : "Empréstimo ativo";
            return {
              id: loan.idEmprestimo ?? loan.id,
              titulo: loan.titulo,
              descricao:
                status === "pendente"
                  ? `Sua reserva de "${loan.titulo}" está aguardando aprovação.`
                  : status === "atrasado"
                  ? `O prazo para devolver "${loan.titulo}" já passou.`
                  : `Seu empréstimo de "${loan.titulo}" vence em ${loan.empLiv_DataPrevistaDevolucao || loan.dataPrevistaDevolucao || "data não informada"}.`,
              data: loan.empLiv_DataPrevistaDevolucao || loan.dataPrevistaDevolucao || loan.dataEmprestimo || "Sem data",
              tipo: tone,
              label,
            };
          });

        const unreadNotifications = allNotifications.filter(notification => !readNotifications.includes(notification.id));

        setStats({
          totalLivros: Number(resumo?.totalLivros ?? 0),
          livrosDisponiveis: Number(resumo?.livrosDisponiveis ?? 0),
          meusEmprestimos: emprestimosAtivos.length,
        });
        setLatestNotifications(unreadNotifications.slice(0, 5));
        setNotificationCount(unreadNotifications.length);
      } catch (err) {
        console.error("Erro ao carregar dashboard de usuário:", err);
      }
    }

    loadDashboardData();
  }, [readNotifications]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleViewAll = () => {
    setIsNotificationsOpen(false);
    // Marcar todas as notificações atuais como lidas
    const newRead = [...readNotifications, ...latestNotifications.map(n => n.id)];
    const uniqueRead = [...new Set(newRead)];
    setReadNotifications(uniqueRead);
    localStorage.setItem('user_notifications_read', JSON.stringify(uniqueRead));
    if (onViewAllNotifications) {
      onViewAllNotifications();
    }
  };

  return (
    <div className="user-page user-dashboard-page page-shell">
      <section className="user-page__hero">
        <div className="user-dashboard-hero">
          <div className="user-dashboard-hero__copy">
            <h1>Olá, {user?.nome?.trim()?.split(/\s+/)[0] || "leitor"}!</h1>
            <p>
              Encontre sua próxima leitura, acompanhe seus empréstimos e fique por dentro das novidades da biblioteca.
            </p>
          </div>

          <div
            className={`user-dashboard-notifications ${
              isNotificationsOpen ? "is-open" : ""
            }`}
            ref={notificationsRef}
          >
            <button
              type="button"
              className="user-dashboard-notifications__trigger"
              aria-label="Abrir notificações"
              aria-expanded={isNotificationsOpen}
              onClick={() =>
                setIsNotificationsOpen((currentOpen) => !currentOpen)
              }
            >
              <FaBell />
              {notificationCount > 0 ? (
                <span className="user-dashboard-notifications__badge">
                  {notificationCount}
                </span>
              ) : null}
            </button>

            {isNotificationsOpen ? (
              <div className="user-dashboard-notifications__panel">
                <div className="user-dashboard-notifications__header">
                  <div>
                    <h3>Notificações e avisos</h3>
                    <p>Atualizações recentes da sua conta</p>
                  </div>

                  <span className="user-dashboard-notifications__count">
                    {notificationCount} novas
                  </span>
                </div>

                <div className="user-dashboard-notifications__list">
                  {latestNotifications.length > 0 ? (
                    latestNotifications.map((notification) => {
                      const meta =
                        notificationTypeMap[notification.tipo] ||
                        notificationTypeMap.info;

                      return (
                        <article
                          className={`user-dashboard-notification user-dashboard-notification--${meta.tone}`}
                          key={notification.id}
                        >
                          <div className="user-dashboard-notification__content">
                            <div
                              className={`user-dashboard-notification__icon user-dashboard-notification__icon--${meta.tone}`}
                            >
                              {meta.icon}
                            </div>

                            <div className="user-dashboard-notification__body">
                              <div className="user-dashboard-notification__top">
                                <strong>{notification.titulo}</strong>
                                <span
                                  className={`notification-badge ${notification.tipo}`}
                                >
                                  {notification.label}
                                </span>
                              </div>

                              <p>{notification.descricao}</p>
                              <small>{notification.data}</small>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="user-empty-state user-dashboard-notifications__empty">
                      Sem notificações no momento.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="view-all user-dashboard-notifications__view-all"
                  onClick={handleViewAll}
                >
                  Ver todas
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="stats-cards-grid stats-cards-grid-admin user-dashboard-stats">
        {cards.map(({ key, title, value, description, icon, color }) => (
          <StatsCard
            key={key}
            title={title}
            value={value}
            subtitle={description}
            icon={icon}
            color={color}
            onClick={() => handleCardClick(key)}
          />
        ))}
      </section>
      <Recomendacoes notifications={(
        <section className="user-dashboard-recent" aria-labelledby="recent-notifications-heading">
        <div className="user-section-card user-dashboard-recent__card">
          <div className="user-section-card__header">
            <div>
              <h2 id="recent-notifications-heading">Notificações recentes</h2>
              <p>Acompanhe as atualizações dos seus empréstimos.</p>
            </div>
            <button type="button" className="user-dashboard-recent__link" onClick={onViewAllNotifications}>Ver todas</button>
          </div>
          {latestNotifications.length ? (
            <div className="user-dashboard-recent__list">
              {latestNotifications.slice(0, 3).map((item) => (
                <div className="user-dashboard-recent__item" key={item.id}>
                  <span className={`user-dashboard-recent__icon user-dashboard-recent__icon--${item.tipo}`} aria-hidden="true">{notificationTypeMap[item.tipo]?.icon}</span>
                  <div><strong>{item.label}</strong><p>{item.descricao}</p></div>
                </div>
              ))}
            </div>
          ) : <div className="user-empty-state">Nenhuma notificação nova no momento.</div>}
        </div>
      </section>
      )} />
    </div>
  );
}
