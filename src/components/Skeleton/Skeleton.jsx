import "./Skeleton.css";

function Bar({ short = false, className = "" }) {
  return <span className={`ui-skeleton__bar ${short ? "ui-skeleton__bar--short" : ""} ${className}`} />;
}

function Copy() {
  return <span className="ui-skeleton__copy"><Bar /><Bar short /></span>;
}

function routeVariant() {
  const path = typeof window === "undefined" ? "" : `${window.location.pathname}${window.location.hash}`.toLowerCase();
  if (/relatorios/.test(path)) return "reports";
  if (/biblioteca|livros|acervo/.test(path)) return "books";
  if (/emprestimos|solicitacoes/.test(path)) return "loans";
  if (/notificacoes/.test(path)) return "notifications";
  if (/configuracoes|perfil|login|senha/.test(path)) return "profile";
  return "dashboard";
}

export default function Skeleton({ variant = "lines", rows = 3, className = "" }) {
  if (variant === "inline") {
    return <span className={`ui-skeleton-inline ${className}`} role="status" aria-label="Carregando conteúdo" />;
  }
  const layout = variant === "page" ? routeVariant() : variant;
  return (
    <div className={`ui-skeleton ui-skeleton--${layout} ${variant === "page" ? "ui-skeleton--page" : ""} ${className}`} role="status" aria-label="Carregando conteúdo">
      <span className="ui-skeleton__sr">Carregando conteúdo</span>
      <div className="ui-skeleton__body" aria-hidden="true">
        {(variant === "page" || layout === "dashboard") && <>
          <div className="ui-skeleton__hero" />
          {layout === "dashboard" && <div className="ui-skeleton__stats">{Array.from({ length: 4 }, (_, i) => <div className="ui-skeleton__stat" key={i}><div className="ui-skeleton__thumb" /><Copy /></div>)}</div>}
        </>}
        {layout === "reports" && <>
          {variant === "page" && <div className="ui-skeleton__filters">{Array.from({ length: 4 }, (_, i) => <div className="ui-skeleton__field" key={i}><Bar short /><div className="ui-skeleton__input" /></div>)}</div>}
          <div className="ui-skeleton__stats">{Array.from({ length: 4 }, (_, i) => <div className="ui-skeleton__stat" key={i}><div className="ui-skeleton__thumb" /><Copy /></div>)}</div>
        </>}
        {layout === "profile" && <div className="ui-skeleton__profile-head"><div className="ui-skeleton__avatar" /><Copy /></div>}
        {layout === "form" && <div className="ui-skeleton__heading" />}
        {layout === "image" ? <div className="ui-skeleton__cover" /> : (
          <div className="ui-skeleton__items">
            {Array.from({ length: variant === "page" ? 3 : rows }, (_, index) => (
              <div className="ui-skeleton__row" key={index}>
                {["books", "loans", "notifications", "cards", "dashboard"].includes(layout) && <div className="ui-skeleton__thumb" />}
                {layout === "form" || layout === "profile" ? <div className="ui-skeleton__field"><Bar short /><div className="ui-skeleton__input" /></div> : <Copy />}
                {["table", "reports", "taxonomy", "loans"].includes(layout) && <div className="ui-skeleton__end" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
