import "./StatsCard.css";

export default function StatsCard({ title, value, subtitle, icon, color = "blue" }) {
  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <span>{title}</span>
        <div className={`stats-card-icon ${color}`}>{icon}</div>
      </div>

      <h2>{value}</h2>

      {subtitle ? <small>{subtitle}</small> : null}
    </div>
  );
}
