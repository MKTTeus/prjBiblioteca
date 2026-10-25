import Skeleton from "../../../components/Skeleton/Skeleton";
import "./Dashboard.css";
import {
  FaBook,
  FaUsers,
  FaExchangeAlt,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlus,
  FaBell,
  FaUserShield,
} from "react-icons/fa";
import { PiStudentFill } from "react-icons/pi";
import { NavLink, useNavigate } from "react-router-dom";
import { RiUserCommunityFill } from "react-icons/ri";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { CalendarDays } from "lucide-react";
import { getDashboardStats } from "../../../services/api";
import { getErrorMessage } from "../../../utils/apiError";

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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [statsErrorMessage, setStatsErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [latestNotifications, setLatestNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [readNotifications, setReadNotifications] = useState(() => {
    const stored = localStorage.getItem("admin_notifications_read");
    return stored ? JSON.parse(stored) : [];
  });
  const notificationsRef = useRef(null);
  const navigate = useNavigate();
  const notificationSlot = document.getElementById("admin-header-notifications");
  const today = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  useEffect(() => {
    async function fetchStats() {
      try {
        setStatsError(false);
        setStatsErrorMessage("");
        const data = await getDashboardStats();
        setStats(data);

        // Gerar notificações baseadas nos stats
        const notifications = [];
        if (data.atrasados > 0) {
          notifications.push({
            id: "atrasados",
            titulo: "Devoluções em atraso",
            descricao:
              data.atrasados +
              " empréstimo(s) estão com devolução atrasada. Acompanhe para evitar multas.",
            data: "Agora",
            tipo: "warning",
            label: "Atraso",
          });
        }
        if (data.reservados > 0) {
          notifications.push({
            id: "reservados",
            titulo: "Reservas pendentes",
            descricao:
              data.reservados +
              " reserva(s) aguardam retirada. Notifique os usuários.",
            data: "Agora",
            tipo: "info",
            label: "Reserva",
          });
        }
        if (data.devolucoesHoje > 0) {
          notifications.push({
            id: "devolucoesHoje",
            titulo: "Devoluções hoje",
            descricao:
              data.devolucoesHoje +
              " empréstimo(s) vencem hoje. Prepare-se para receber os livros.",
            data: "Hoje",
            tipo: "success",
            label: "Vencimento",
          });
        }

        const unreadNotifications = notifications.filter(
          (notification) => !readNotifications.includes(notification.id),
        );

        setLatestNotifications(unreadNotifications.slice(0, 5));
        setNotificationCount(unreadNotifications.length);
      } catch (err) {
        console.error("Erro ao carregar estatísticas do dashboard:", err);
        setStatsError(true);
        setStatsErrorMessage(getErrorMessage(err, "O painel não conseguiu carregar os indicadores de acervo e circulação. Verifique sua conexão e tente novamente."));
      }
    }

    fetchStats();
  }, [readNotifications, retryKey]);

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
    const newRead = [
      ...readNotifications,
      ...latestNotifications.map((n) => n.id),
    ];
    const uniqueRead = [...new Set(newRead)];
    setReadNotifications(uniqueRead);
    localStorage.setItem(
      "admin_notifications_read",
      JSON.stringify(uniqueRead),
    );
    navigate("/admin/notificacoes");
  };

  if (!stats) {
    return statsError ? (
      <div className="dashboard page-shell" role="alert">
        <p>{statsErrorMessage || "O painel não conseguiu carregar os indicadores de acervo e circulação."}</p>
        <button type="button" onClick={() => setRetryKey((key) => key + 1)}>Tentar novamente</button>
      </div>
    ) : <Skeleton variant="dashboard" />;
  }

  return (
    <div className="dashboard page-shell">
      <div className="header-dashboard">
        <div className="header-dashboard-content">
          <h1>Bem-vindo ao Sistema de Biblioteca</h1>
          <p>
            Gerencie o acervo, empréstimos e cadastros da biblioteca escolar de
            forma simples e eficiente.
          </p>
        </div>

        <div className="admin-dashboard-date">
          <span className="admin-dashboard-date__icon"><CalendarDays size={27} /></span>
          <span><small>Hoje é</small><strong>{today}</strong><small>Bom trabalho!</small></span>
        </div>
      </div>

      {notificationSlot && createPortal(<div
          className={`admin-dashboard-notifications ${
            isNotificationsOpen ? "is-open" : ""
          }`}
          ref={notificationsRef}
        >
          <button
            type="button"
            className="admin-dashboard-notifications__trigger"
            aria-label="Abrir notificações"
            aria-expanded={isNotificationsOpen}
            onClick={() =>
              setIsNotificationsOpen((currentOpen) => !currentOpen)
            }
          >
            <FaBell />
            {notificationCount > 0 ? (
              <span className="admin-dashboard-notifications__badge">
                {notificationCount}
              </span>
            ) : null}
          </button>

          {isNotificationsOpen ? (
            <div className="admin-dashboard-notifications__panel">
              <div className="admin-dashboard-notifications__header">
                <div>
                  <h3>Notificações e avisos</h3>
                  <p>Atualizações recentes do sistema</p>
                </div>

                <span className="admin-dashboard-notifications__count">
                  {notificationCount} novas
                </span>
              </div>

              <div className="admin-dashboard-notifications__list">
                {latestNotifications.length > 0 ? (
                  latestNotifications.map((notification) => {
                    const meta =
                      notificationTypeMap[notification.tipo] ||
                      notificationTypeMap.info;

                    return (
                      <article
                        className={`admin-dashboard-notification admin-dashboard-notification--${meta.tone}`}
                        key={notification.id}
                      >
                        <div className="admin-dashboard-notification__content">
                          <div
                            className={`admin-dashboard-notification__icon admin-dashboard-notification__icon--${meta.tone}`}
                          >
                            {meta.icon}
                          </div>

                          <div className="admin-dashboard-notification__body">
                            <div className="admin-dashboard-notification__top">
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
                  <div className="admin-empty-state admin-dashboard-notifications__empty">
                    Sem notificações no momento.
                  </div>
                )}
              </div>

              <button
                type="button"
                className="view-all admin-dashboard-notifications__view-all"
                onClick={handleViewAll}
              >
                Ver todas
              </button>
            </div>
          ) : null}
        </div>, notificationSlot)}

      <div className="cards">
        <NavLink to="/admin/livros" className="card card-link">
          <div className="card-header">
            <span>Títulos ativos</span>
            <div className="icon blue">
              <FaBook />
            </div>
          </div>
          <h2>{stats.totalLivros}</h2>
          <small>Inclui títulos sem exemplares.</small>
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

        <NavLink to="/admin/emprestimos" className="card card-link">
            <div className="card-header">
              <span>Empréstimos Ativos</span>
              <div className="icon orange">
                <FaExchangeAlt />
              </div>
            </div>
            <h2>{stats.emprestimosAtivos}</h2>
            <small>Em andamento</small>
        </NavLink>

        <NavLink to="/admin/emprestimos" className="card card-link">
            <div className="card-header">
              <span>Devoluções Pendentes</span>
              <div className="icon red">
                <FaClock />
              </div>
            </div>
            <h2>{stats.atrasados}</h2>
            <small className="danger">Acompanhe os atrasos</small>
        </NavLink>
      </div>

      <div className="quick-actions">
        <p>Ações Rápidas</p>

        <div className="actions-container">
          <NavLink to="/admin/emprestimos" className="action-btn action-btn--primary">
              <FaPlus />
              <span>Novo Empréstimo</span>
          </NavLink>

          <NavLink to="/admin/livros" className="action-btn action-btn--book">
              <FaBook />
              <span>Cadastrar Livro</span>
          </NavLink>

          <NavLink to="/admin/alunos" className="action-btn action-btn--student">
              <PiStudentFill />
              <span>Cadastrar Aluno</span>
          </NavLink>

          <NavLink to="/admin/comunidade" className="action-btn action-btn--community">
              <RiUserCommunityFill />
              <span>Cadastrar Comunidade</span>
          </NavLink>

          <NavLink to="/admin/admins" className="action-btn action-btn--admin">
              <FaUserShield />
              <span>Cadastrar Admin</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}
