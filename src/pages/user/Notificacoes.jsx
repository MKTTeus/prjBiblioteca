import React from "react";
import { mockNotifications } from "./mockData";
import "./UserArea.css";

const notificationTypeLabelMap = {
  info: "Informação",
  warning: "Aviso",
  success: "Atualização",
};

export default function Notificacoes() {
  return (
    <div className="user-page">
      <section className="user-page__hero">
        <h2>Notificações</h2>
        <p>Central mockada de avisos para evoluir a experiência do aluno e da comunidade.</p>
      </section>

      <section className="user-notifications-list">
        {mockNotifications.map((notification) => (
          <article className="user-notification-item" key={notification.id}>
            <div className="user-notification-item__top">
              <div>
                <h4>{notification.titulo}</h4>
                <small>{notification.data}</small>
              </div>

              <span className={`notification-badge ${notification.tipo}`}>
                {notificationTypeLabelMap[notification.tipo] || notification.tipo}
              </span>
            </div>

            <p>{notification.descricao}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
