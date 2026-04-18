import React, { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
} from "react-icons/fa";
import { getEmprestimos } from "../../services/api";
import "./UserArea.css";

const notificationTypeMap = {
  info: {
    label: "Informação",
    icon: <FaClock />,
  },
  warning: {
    label: "Aviso",
    icon: <FaExclamationTriangle />,
  },
  success: {
    label: "Atualização",
    icon: <FaCheckCircle />,
  },
};

export default function Notificacoes() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadNotifications() {
      setIsLoading(true);
      setError(null);

      try {
        const loans = await getEmprestimos();
        const loanItems = Array.isArray(loans) ? loans : [];
        const mappedNotifications = loanItems.map((loan) => {
          const status = String(loan.status || "").toLowerCase();
          const tipo = status === "atrasado" ? "warning" : status === "ativo" ? "success" : "info";
          const descricao =
            status === "pendente"
              ? `Sua reserva de ${loan.titulo || "um livro"} está aguardando retirada.`
              : status === "atrasado"
              ? `O prazo para devolver ${loan.titulo || "um livro"} já passou.`
              : `Seu empréstimo de ${loan.titulo || "um livro"} vence em ${loan.dataDevolucao || "breve"}.`;

          return {
            id: loan.idEmprestimo ?? loan.id,
            titulo: loan.titulo || "Livro desconhecido",
            descricao,
            data: loan.dataDevolucao || loan.dataEmprestimo || "Sem data",
            tipo,
          };
        });

        setNotifications(mappedNotifications);
      } catch (err) {
        console.error("Erro ao carregar notificações:", err);
        setError("Erro ao carregar notificações. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    }

    loadNotifications();
  }, []);

  return (
    <div className="user-page">
      <section className="user-page__hero">
        <h2>Notificações</h2>
        <p>Visualize avisos a partir do seu histórico de empréstimos.</p>
      </section>

      <section className="user-section-card">
        <div className="user-notifications-list">
          {isLoading ? (
            <div className="user-empty-state">Carregando notificações...</div>
          ) : error ? (
            <div className="user-empty-state">{error}</div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => {
              const meta = notificationTypeMap[notification.tipo] || notificationTypeMap.info;

              return (
                <article
                  className={`user-notification-item user-notification-item--${notification.tipo}`}
                  key={notification.id}
                >
                  <div className="user-notification-item__content">
                    <span
                      className={`user-notification-item__icon user-notification-item__icon--${notification.tipo}`}
                    >
                      {meta.icon}
                    </span>

                    <div className="user-notification-item__body">
                      <div className="user-notification-item__top">
                        <div>
                          <h4>{notification.titulo}</h4>
                          <small>{notification.data}</small>
                        </div>

                        <span className={`notification-badge ${notification.tipo}`}>
                          {meta.label}
                        </span>
                      </div>

                      <p>{notification.descricao}</p>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="user-empty-state">Sem notificações no momento.</div>
          )}
        </div>
      </section>
    </div>
  );
}
