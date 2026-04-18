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
import StatsCard from "../../components/StatsCard/StatsCard";
import { getBooks, getEmprestimos } from "../../services/api";
import "./UserArea.css";

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

export default function DashboardHome({ onViewAllNotifications }) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [latestNotifications, setLatestNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [stats, setStats] = useState({
    totalLivros: 0,
    livrosDisponiveis: 0,
    meusEmprestimos: 0,
  });
  const notificationsRef = useRef(null);

  const cards = [
    {
      key: "total",
      title: "Total de livros",
      value: stats.totalLivros,
      description: "Quantidade de títulos disponíveis no acervo escolar.",
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

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [books, loans] = await Promise.all([getBooks(), getEmprestimos()]);

        const availableBooks = Array.isArray(books)
          ? books.reduce((acc, book) => acc + (Number(book.disponiveis ?? 0) > 0 ? 1 : 0), 0)
          : 0;

        const loanItems = Array.isArray(loans) ? loans : [];
        const notifications = loanItems
          .filter((loan) => loan.titulo && loan.dataDevolucao)
          .map((loan) => {
            const status = String(loan.status || "").toLowerCase();
            const tone = status === "atrasado" ? "warning" : status === "ativo" ? "success" : "info";
            const label = status === "pendente" ? "Reserva pendente" : status === "atrasado" ? "Atrasado" : "Empréstimo ativo";
            return {
              id: loan.idEmprestimo ?? loan.id,
              titulo: loan.titulo,
              descricao:
                status === "pendente"
                  ? `Sua reserva de ${loan.titulo} está aguardando retirada.`
                  : status === "atrasado"
                  ? `O prazo para devolver ${loan.titulo} já passou.`
                  : `Seu empréstimo de ${loan.titulo} vence em ${loan.dataDevolucao}.`,
              data: loan.dataDevolucao || loan.dataEmprestimo || "Sem data",
              tipo: tone,
              label,
            };
          })
          .slice(0, 5);

        setStats({
          totalLivros: Array.isArray(books) ? books.length : 0,
          livrosDisponiveis: availableBooks,
          meusEmprestimos: loanItems.length,
        });
        setLatestNotifications(notifications);
        setNotificationCount(notifications.length);
      } catch (err) {
        console.error("Erro ao carregar dashboard de usuário:", err);
      }
    }

    loadDashboardData();
  }, []);

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
    if (onViewAllNotifications) {
      onViewAllNotifications();
    }
  };

  return (
    <div className="user-page user-dashboard-page">
      <section className="user-page__hero">
        <div className="user-dashboard-hero">
          <div className="user-dashboard-hero__copy">
            <h1>Área do usuário</h1>
            <p>
              Acompanhe seus empréstimos, consulte o acervo da biblioteca e veja os
              avisos mais recentes em um único lugar.
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
          />
        ))}
      </section>
    </div>
  );
}
