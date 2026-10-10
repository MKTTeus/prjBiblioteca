import React, { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
} from "react-icons/fa";
import { getEmprestimos } from "../../../services/api";
import { formatarData } from "../../../utils/masks";
import "../UserArea.css";
import "./Notificacoes.css";

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
          const titulo = loan.titulo || 'um livro';
          const descricao = {
            pendente:`Sua solicitação de ${titulo} está aguardando análise.`,
            aprovado:`Sua solicitação de ${titulo} foi aprovada. Procure a biblioteca para retirar.`,
            atrasado:`O prazo para devolver ${titulo} já passou.`,
            devolvido:`A devolução de ${titulo} foi registrada.`,
            negado:`Sua solicitação de ${titulo} foi negada.`,
            expirado:`O prazo de retirada de ${titulo} expirou.`
          }[status] || `Seu empréstimo de ${titulo} vence em ${loan.dataPrevistaDevolucao ? formatarData(loan.dataPrevistaDevolucao) : 'breve'}.`;


          return {
            id: `${loan.idEmprestimo ?? loan.id}-${loan.idExemplar}`,
            titulo: loan.titulo || "Livro desconhecido",
            descricao,
            data: loan.dataPrevistaDevolucao || loan.dataEmprestimo ? formatarData(loan.dataPrevistaDevolucao || loan.dataEmprestimo) : "Sem data",
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
    <div className="user-page page-shell">
      <section className="user-page__hero">
        <div className="user-page__hero-content">
          <h2>Notificações</h2>
          <p>Visualize avisos a partir do seu histórico de empréstimos.</p>
        </div>
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
