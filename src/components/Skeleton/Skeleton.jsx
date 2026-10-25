import "./Skeleton.css";

export default function Skeleton({ variant = "lines", rows = 3, className = "" }) {
  if (variant === "inline") {
    return <span className={`ui-skeleton-inline ${className}`} role="status" aria-label="Carregando conteúdo" />;
  }
  const count = variant === "page" ? 4 : rows;

  return (
    <div className={`ui-skeleton ui-skeleton--${variant} ${className}`} role="status" aria-label="Carregando conteúdo">
      <span className="ui-skeleton__sr">Carregando conteúdo</span>
      <div className="ui-skeleton__body" aria-hidden="true">
        {variant === "page" && <div className="ui-skeleton__hero" />}
        {variant === "form" && <div className="ui-skeleton__heading" />}
        {Array.from({ length: count }, (_, index) => (
          <div className="ui-skeleton__row" key={index}>
            {(variant === "cards" || variant === "page") && <div className="ui-skeleton__thumb" />}
            <div className="ui-skeleton__copy">
              <div className="ui-skeleton__bar" />
              <div className="ui-skeleton__bar ui-skeleton__bar--short" />
            </div>
            {variant === "table" && <div className="ui-skeleton__end" />}
          </div>
        ))}
      </div>
    </div>
  );
}
