import "./StatsCard.css";

export default function StatsCard({ title, value, subtitle, icon, color = "blue", onClick }) {
  const handleKeyDown = (e) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div
      className={`stats-card ${onClick ? "stats-card--clickable" : ""}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="stats-card-header">
        <span>{title}</span>
        <div className={`stats-card-icon ${color}`}>{icon}</div>
      </div>

      <h2>{value}</h2>

      {subtitle ? <small>{subtitle}</small> : null}
    </div>
  );
}
