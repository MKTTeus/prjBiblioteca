import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, Bell, BellOff, BookOpen, BookOpenCheck, CalendarDays,
  CheckCircle2, ChevronDown, Clock3, LibraryBig, RotateCcw, XCircle,
} from "lucide-react";
import Skeleton from "../../../components/Skeleton/Skeleton";
import { getEmprestimos, getPublicBookDetails } from "../../../services/api";
import { formatarData } from "../../../utils/masks";
import { resolverStatus } from "../../../utils/loanStatus";
import { getErrorMessage } from "../../../utils/apiError";
import "../UserArea.css";
import "./Notificacoes.css";

// A API de empréstimos informa o estado atual de cada exemplar, não um feed
// histórico de eventos. Não criamos datas de aprovação nem horários fictícios.
const TYPES = {
  atrasado: {
    title: "Devolução em atraso", badge: "Em atraso", kind: "danger",
    icon: AlertCircle, message: "O prazo de devolução terminou. Procure a biblioteca para regularizar.",
  },
  aprovado: {
    title: "Solicitação aprovada", badge: "Aguardando retirada", kind: "blue",
    icon: BookOpenCheck, message: "Sua solicitação foi aprovada. O livro aguarda retirada na escola.",
  },
  pendente: {
    title: "Solicitação em análise", badge: "Em análise", kind: "orange",
    icon: Clock3, message: "Sua solicitação está em análise pela equipe da biblioteca.",
  },
  ativo: {
    title: "Empréstimo em andamento", badge: "Em andamento", kind: "blue",
    icon: BookOpen, message: "O empréstimo está ativo. Acompanhe o prazo de devolução.",
  },
  devolvido: {
    title: "Devolução registrada", badge: "Concluído", kind: "green",
    icon: CheckCircle2, message: "A biblioteca registrou a devolução deste livro.",
  },
  negado: {
    title: "Solicitação não aprovada", badge: "Não aprovada", kind: "neutral",
    icon: XCircle, message: "Sua solicitação não foi aprovada. Consulte a biblioteca para mais informações.",
  },
  expirado: {
    title: "Solicitação expirada", badge: "Expirado", kind: "neutral",
    icon: Clock3, message: "O prazo de retirada da solicitação terminou.",
  },
  desconhecido: {
    title: "Atualização do empréstimo", badge: "Informação", kind: "blue",
    icon: Bell, message: "Consulte os detalhes do seu empréstimo.",
  },
};
const loanDate = l => l.empLiv_DataEmprestimo || l.dataEmprestimo || l.movDataEmprestimo || null;
const dueDate = l => l.empLiv_DataPrevistaDevolucao || l.dataPrevistaDevolucao || null;
const returnDate = l => l.empLiv_DataDevolucao || l.dataDevolucao || null;
const confirmationDate = l => l.dataConfirmacao || null;
const dateText = value => value ? formatarData(value) : "Não informada";
const validDateValue = value => value ? Date.parse(value) || 0 : 0;

const coverCache = new Map();
function coverForBook(idLivro) {
  const key = String(idLivro);
  if (!coverCache.has(key)) {
    coverCache.set(key, getPublicBookDetails(idLivro)
      .then(data => data?.livro?.livCapaURL || data?.livro?.capa || null)
      .catch(() => null));
  }
  return coverCache.get(key);
}

function NotificationCover({ item }) {
  const direct = item.livCapaURL || item.capa || "";
  const [src, setSrc] = useState(direct);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    let active = true;
    setBroken(false);
    setSrc(direct);
    if (!direct && item.idLivro != null && item.idLivro !== "") {
      coverForBook(item.idLivro).then(url => { if (active) setSrc(url || ""); });
    }
    return () => { active = false; };
  }, [direct, item.idLivro]);
  return <span className="user-notice-cover">
    {typeof src === "string" && src.trim() && !broken ?
      <img src={src} alt={"Capa de " + (item.titulo || "livro")} loading="lazy" onError={() => setBroken(true)} /> :
      <BookOpen size={22} strokeWidth={1.6} aria-hidden="true" />}
  </span>;
}

function makeNotification(l, index) {
  const status = resolverStatus(l);
  const meta = TYPES[status] || TYPES.desconhecido;
  const returned = returnDate(l);
  const due = dueDate(l);
  const confirmed = confirmationDate(l);
  const registered = loanDate(l);
  const date = status === "devolvido" ? returned :
    status === "atrasado" ? due :
    status === "aprovado" ? (confirmed || registered) : registered;
  const dateLabel = status === "devolvido" ? "Devolução" :
    status === "atrasado" ? "Prazo de devolução" :
    status === "aprovado" && confirmed ? "Confirmação" : "Data do registro";
  const key = [l.idEmprestimo ?? l.idMovimentacao ?? l.id ?? index, l.idExemplar ?? index].join("-");
  return { ...l, key, status, meta, due, returned, registered, confirmed, date, dateLabel,
    titulo: l.titulo || l.empLiv_Titulo || "Livro não informado",
    tombo: l.codigo || l.empLiv_Tombo || "Não informado" };
}

function Info({ label, value }) {
  if (value == null || value === "") return null;
  return <div className="user-notice-detail"><dt>{label}</dt><dd>{value}</dd></div>;
}

function NotificationRow({ item, open, onToggle, onViewLoan, priority = false }) {
  const Icon = item.meta.icon;
  const detailsId = "user-notice-" + item.key.replace(/[^a-zA-Z0-9_-]/g, "-");
  return <article className={"user-notice-row user-notice-row--" + item.meta.kind + (open ? " is-open" : "")}>
    <div className="user-notice-row__summary">
      <button type="button" className="user-notice-row__trigger" onClick={onToggle}
        aria-expanded={open} aria-controls={detailsId}
        aria-label={(open ? "Recolher" : "Expandir") + " notificação: " + item.meta.title + " — " + item.titulo}>
        <span className={"user-notice-row__icon user-notice-row__icon--" + item.meta.kind} aria-hidden="true"><Icon size={19}/></span>
        <NotificationCover item={item}/>
        <span className="user-notice-row__text">
          <strong>{item.meta.title}</strong>
          <span className="user-notice-row__book">{item.titulo}</span>
          <span className="user-notice-row__message">{item.meta.message}</span>
          <span className={"user-notice-row__badge user-notice-row__badge--" + item.meta.kind}>{item.meta.badge}</span>
        </span>
        <span className="user-notice-row__date">
          {item.date && <strong>{dateText(item.date)}</strong>}
          <small>{item.date ? item.dateLabel : "Data não informada"}</small>
        </span>
        <ChevronDown className="user-notice-row__chevron" size={19} aria-hidden="true"/>
      </button>
      {priority && <button type="button" className="user-notice-row__quick" onClick={onViewLoan}>Ver empréstimo</button>}
    </div>
    {open && <div id={detailsId} className="user-notice-row__expanded">
      <dl className="user-notice-row__details">
        <Info label="Título" value={item.titulo}/>
        <Info label="Tombo" value={item.tombo}/>
        <Info label="Situação atual" value={item.meta.badge}/>
        <Info label="Data do registro" value={item.registered ? dateText(item.registered) : null}/>
        <Info label="Data da confirmação" value={item.confirmed ? dateText(item.confirmed) : null}/>
        <Info label="Prazo de devolução" value={item.due ? dateText(item.due) : null}/>
        <Info label="Data da devolução" value={item.returned ? dateText(item.returned) : null}/>
        <Info label="Renovações" value={item.renovacoes ?? item.empLiv_RenovacoesTotais ?? null}/>
      </dl>
      <div className="user-notice-row__expanded-action">
        <p>{item.meta.message}</p>
        <button type="button" onClick={onViewLoan}>Ver empréstimo</button>
      </div>
    </div>}
  </article>;
}

export default function Notificacoes() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(() => new Set());
  const [visible, setVisible] = useState(8);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    getEmprestimos().then(loans => {
      if (active) setNotifications(Array.isArray(loans) ? loans.map(makeNotification) : []);
    }).catch(err => {
      console.error("Erro ao carregar notificações:", err);
      if (active) setError(getErrorMessage(err, "Não foi possível carregar seus avisos. Verifique sua conexão e tente novamente."));
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const { attention, updates } = useMemo(() => {
    const sorted = [...notifications].sort((a, b) => validDateValue(b.date) - validDateValue(a.date));
    return { attention: sorted.filter(n => n.status === "atrasado"),
      updates: sorted.filter(n => n.status !== "atrasado") };
  }, [notifications]);
  const toggle = key => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const row = (item, attentionItem = false) => <NotificationRow key={item.key} item={item}
    priority={attentionItem} open={expanded.has(item.key)} onToggle={() => toggle(item.key)}
    onViewLoan={() => navigate("/user/emprestimos")}/>;

  return <div className="user-page page-shell user-notifications-page">
    <section className="user-page__hero">
      <div className="user-page__hero-content">
        <h2>Notificações</h2>
        <p>Acompanhe avisos e movimentações dos seus livros.</p>
      </div>
      <Bell className="user-notifications-hero-icon" size={39} aria-hidden="true"/>
    </section>
    <section className="user-notifications-panel" aria-label="Notificações dos seus empréstimos">
      {isLoading ? <div className="user-notifications-loading"><Skeleton variant="notifications" /></div> :
        error ? <div className="user-notifications-empty" role="alert">
          <BellOff size={42} aria-hidden="true"/>
          <h3>Não foi possível carregar suas notificações</h3><p>{error}</p>
          <button type="button" onClick={() => setRetry(n => n+1)}><RotateCcw size={16} /> Tentar novamente</button>
        </div> : !notifications.length ? <div className="user-notifications-empty">
          <Bell size={48} strokeWidth={1.4} aria-hidden="true"/>
          <h3>Tudo em dia!</h3><p>Nenhum aviso sobre seus empréstimos no momento.</p>
          <button type="button" onClick={() => navigate("/user/biblioteca")}><LibraryBig size={17}/> Explorar livros</button>
        </div> : <>
          {attention.length > 0 && <div className="user-notifications-group">
            <h3><AlertCircle size={20} aria-hidden="true" className="user-notifications-heading-danger"/> Precisam da sua atenção ({attention.length})</h3>
            <div className="user-notifications-items">{attention.map(item => row(item, true))}</div>
          </div>}
          {updates.length > 0 && <div className="user-notifications-group">
            <h3><Clock3 size={20} aria-hidden="true"/> Atualizações dos empréstimos ({updates.length})</h3>
            <div className="user-notifications-items">{updates.slice(0, visible).map(item => row(item))}</div>
            {visible < updates.length && <div className="user-notifications-more">
              <button type="button" onClick={() => setVisible(v => v+8)}>Mostrar mais notificações <ChevronDown size={16}/></button>
              <small>Exibindo {Math.min(visible, updates.length)} de {updates.length}</small>
            </div>}
          </div>}
        </>}
    </section>
  </div>;
}
