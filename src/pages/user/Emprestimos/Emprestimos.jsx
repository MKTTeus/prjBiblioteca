import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BookOpen, BookOpenCheck, CalendarDays, ChevronDown, ChevronUp, Clock3, FileText, LibraryBig, List, RotateCcw, Search, X } from "lucide-react";
import StatsCard from "../../../components/StatsCard/StatsCard";
import Skeleton from "../../../components/Skeleton/Skeleton";
import { getEmprestimos } from "../../../services/api";
import { formatarData } from "../../../utils/masks";
import { resolverStatus } from "../../../utils/loanStatus";
import { getErrorMessage } from "../../../utils/apiError";
import "./Emprestimos.css";

const TABS = [
  { key: "todos", label: "Todos" },
  { key: "pendente", label: "Em análise" },
  { key: "aprovado", label: "Aguardando retirada" },
  { key: "ativo", label: "Em andamento" },
  { key: "atrasado", label: "Atrasados" },
  { key: "historico", label: "Histórico" },
];

const STATUS = {
  pendente: { label: "Em análise", description: "Aguardando aprovação da biblioteca" },
  aprovado: { label: "Aguardando retirada", description: "Sua solicitação foi aprovada" },
  ativo: { label: "Em andamento", description: "Livro com você" },
  atrasado: { label: "Atrasado", description: "Prazo de devolução vencido" },
  devolvido: { label: "Devolvido", description: "Devolução registrada" },
  negado: { label: "Negado", description: "Solicitação não aprovada" },
  expirado: { label: "Expirado", description: "Prazo de retirada expirado" },
};

const isHistorico = (s) => ["devolvido", "negado", "expirado"].includes(s);
const statusDaAba = (loan, filtro) => filtro === "todos" || (
  filtro === "historico" ? isHistorico(loan._status) : loan._status === filtro
);
const dataExibida = (valor) => valor ? formatarData(valor) : "Não informada";
const prazoDe = (l) => l.empLiv_DataPrevistaDevolucao || l.dataPrevistaDevolucao;
const dataRetirada = (l) => l.empLiv_DataEmprestimo || l.dataEmprestimo;
const dataDevolucao = (l) => l.empLiv_DataDevolucao || l.dataDevolucao;

const EMPTY = {
  todos: ["Nenhum empréstimo encontrado", "Quando você solicitar ou retirar livros, eles aparecerão aqui."],
  pendente: ["Nenhuma solicitação em análise", "As solicitações aguardando aprovação aparecerão aqui."],
  aprovado: ["Nenhum livro aguardando retirada", "As solicitações aprovadas aparecerão aqui."],
  ativo: ["Nenhum empréstimo em andamento", "Os livros retirados aparecerão aqui com o prazo de devolução."],
  atrasado: ["Nenhum livro em atraso", "Ótimo! Você não tem devoluções atrasadas."],
  historico: ["Seu histórico está vazio", "As devoluções e solicitações encerradas aparecerão aqui."],
};

function LoanRow({ loan, itemIndex }) {
  const [expanded, setExpanded] = useState(false);
  const status = loan._status;
  const meta = STATUS[status] || { label: status || "Não informado", description: "Consulte a biblioteca para informações." };
  const key = String(loan.idEmprestimo ?? loan.id ?? itemIndex) + "-" + String(loan.idExemplar ?? itemIndex);
  const detailId = "loan-detail-" + key.replace(/[^a-zA-Z0-9_-]/g, "");
  const prazo = prazoDe(loan);
  const data = dataRetirada(loan);
  const title = loan.titulo || loan.empLiv_Titulo || "Livro sem título";
  const codigo = loan.codigo || loan.empLiv_Tombo || "Não informado";

  return (
    <article className={"user-loan-row user-loan-row--" + status} aria-label={title + ", " + meta.label}>
      <div className="user-loan-row__main">
        <div className="user-loan-row__book">
          <div className="user-loan-row__thumbnail" aria-hidden="true"><BookOpen size={27} strokeWidth={1.5} /></div>
          <div className="user-loan-row__identity">
            <strong title={title}>{title}</strong>
            <span>Tombo: {codigo}</span>
            <span className={"user-loan-row__badge user-loan-row__badge--" + status}>{meta.label}</span>
          </div>
        </div>

        <div className="user-loan-row__dates">
          <div className="user-loan-row__field">
            <small>{status === "pendente" ? "Registrado em" : status === "aprovado" ? "Aprovado para retirada" : "Retirada"}</small>
            <strong>{status === "aprovado" ? "Aguardando retirada" : dataExibida(data)}</strong>
          </div>
          <div className="user-loan-row__field">
            <small>{status === "atrasado" ? "Deveria devolver em" : status === "aprovado" ? "Próxima etapa" : isHistorico(status) ? "Registro encerrado" : "Devolver até"}</small>
            <strong className={status === "atrasado" ? "user-loan-row__date--late" : ""}>{status === "aprovado" ? "Retirar na escola" : isHistorico(status) && dataDevolucao(loan) ? dataExibida(dataDevolucao(loan)) : dataExibida(prazo)}</strong>
          </div>
          <div className="user-loan-row__field user-loan-row__renewals">
            <small>Renovações</small>
            <strong>{loan.renovacoes ?? loan.empLiv_RenovacoesTotais ?? 0}</strong>
          </div>
        </div>

        <button
          type="button"
          className="user-loan-row__details-button"
          aria-expanded={expanded}
          aria-controls={detailId}
          aria-label={(expanded ? "Ocultar detalhes de " : "Ver detalhes de ") + title}
          onClick={() => setExpanded(value => !value)}
        >
          <span>{expanded ? "Ocultar detalhes" : "Ver detalhes"}</span>
          {expanded ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}
        </button>
      </div>
      {expanded && (
        <div className="user-loan-row__expanded" id={detailId}>
          <div><small>Situação atual</small><strong>{meta.description}</strong></div>
          <div><small>Tombo do exemplar</small><strong>{codigo}</strong></div>
          <div><small>Data do registro</small><strong>{dataExibida(data)}</strong></div>
          <div><small>Prazo de devolução</small><strong>{dataExibida(prazo)}</strong></div>
          {dataDevolucao(loan) && <div><small>Devolvido em</small><strong>{dataExibida(dataDevolucao(loan))}</strong></div>}
          <div><small>Renovações registradas</small><strong>{loan.renovacoes ?? loan.empLiv_RenovacoesTotais ?? 0}</strong></div>
        </div>
      )}
    </article>
  );
}

export default function Emprestimos() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [pesquisa, setPesquisa] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelado = false;
    async function fetchLoans({ mostrarLoading }) {
      if (mostrarLoading) { setIsLoading(true); setError(null); }
      try {
        const data = await getEmprestimos();
        if (cancelado) return;
        setLoans(Array.isArray(data) ? data : []);
        if (mostrarLoading) setError(null);
      } catch (err) {
        console.error("Erro ao carregar empréstimos:", err);
        if (!cancelado && mostrarLoading) {
          setLoans([]);
          setError(getErrorMessage(err, "Não foi possível carregar seus empréstimos. Verifique sua conexão e tente novamente."));
        }
      } finally {
        if (mostrarLoading && !cancelado) setIsLoading(false);
      }
    }
    fetchLoans({ mostrarLoading: true });
    const interval = setInterval(() => fetchLoans({ mostrarLoading: false }), 10000);
    const aoFocar = () => { if (document.visibilityState === "visible") fetchLoans({ mostrarLoading: false }); };
    document.addEventListener("visibilitychange", aoFocar);
    window.addEventListener("focus", aoFocar);
    return () => {
      cancelado = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", aoFocar);
      window.removeEventListener("focus", aoFocar);
    };
  }, [retry]);

  const comStatus = useMemo(() => loans.map(l => ({ ...l, _status: resolverStatus(l) })), [loans]);
  const counts = useMemo(() => ({
    todos: comStatus.length,
    pendente: comStatus.filter(l => l._status === "pendente").length,
    aprovado: comStatus.filter(l => l._status === "aprovado").length,
    ativo: comStatus.filter(l => l._status === "ativo").length,
    atrasado: comStatus.filter(l => l._status === "atrasado").length,
    historico: comStatus.filter(l => isHistorico(l._status)).length,
  }), [comStatus]);
  const filtrados = useMemo(() => {
    const texto = pesquisa.trim().toLocaleLowerCase("pt-BR");
    return comStatus.filter(l => statusDaAba(l, filtro)).filter(l => {
      if (!texto) return true;
      return [l.titulo, l.empLiv_Titulo, l.codigo, l.empLiv_Tombo].some(v => String(v || "").toLocaleLowerCase("pt-BR").includes(texto));
    });
  }, [comStatus, filtro, pesquisa]);

  const stats = [
    { title: "Em análise", value: counts.pendente, subtitle: "Aguardando aprovação", icon: <Clock3 size={20} />, color: "orange" },
    { title: "Aguardando retirada", value: counts.aprovado, subtitle: "Aprovados e prontos", icon: <BookOpen size={20} />, color: "blue" },
    { title: "Em andamento", value: counts.ativo, subtitle: "Livros com você", icon: <BookOpenCheck size={20} />, color: "green" },
    { title: "Atrasados", value: counts.atrasado, subtitle: "Prazo vencido", icon: <AlertTriangle size={20} />, color: "red" },
  ];
  const [emptyTitle, emptyDescription] = EMPTY[filtro];

  return (
    <div className="user-page user-loans-page page-shell">
      <section className="user-page__hero">
        <div className="user-page__hero-content">
          <h2>Meus empréstimos</h2>
          <p>Acompanhe suas solicitações, empréstimos ativos e histórico de leitura.</p>
        </div>
      </section>

      <div className="stats-cards-grid user-loans-stats" aria-label="Resumo dos empréstimos">
        {stats.map(card => (
          <StatsCard key={card.title} {...card} value={isLoading ? "—" : card.value} />
        ))}
      </div>

      <section className="user-section-card user-loans-panel" aria-labelledby="my-loans-heading">
        <div className="user-loans-panel__header">
          <span className="user-loans-panel__heading-icon" aria-hidden="true"><List size={20} /></span>
          <div className="user-loans-panel__heading">
            <h3 id="my-loans-heading">Meus empréstimos</h3>
            <p>Veja todas as suas solicitações e movimentações.</p>
          </div>
          <div className="user-loans-search">
            <Search size={17} aria-hidden="true" />
            <input type="search" aria-label="Buscar empréstimos" placeholder="Buscar por livro ou tombo..." value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
            {pesquisa && <button type="button" onClick={() => setPesquisa("")} aria-label="Limpar busca"><X size={16} /></button>}
          </div>
        </div>
        <div className="user-loans-tabs" role="group" aria-label="Filtrar empréstimos por situação">
          {TABS.map(tab => (
            <button key={tab.key} type="button" className={"user-loans-tab" + (filtro === tab.key ? " is-active" : "")}
              aria-pressed={filtro === tab.key} onClick={() => setFiltro(tab.key)}>
              {tab.label} <span>({counts[tab.key]})</span>
            </button>
          ))}
        </div>

        <div className="user-loans-panel__content">
          {isLoading ? <Skeleton variant="loans" /> :
            error ? <div className="user-loans-empty" role="alert">
              <FileText size={36} aria-hidden="true" />
              <h4>Não foi possível carregar os empréstimos</h4><p>{error}</p>
              <button type="button" className="user-loans-cta" onClick={() => setRetry(v => v + 1)}><RotateCcw size={16} /> Tentar novamente</button>
            </div> :
            filtrados.length > 0 ? <div className="user-loans-list">
              {filtrados.map((loan, index) => <LoanRow key={String(loan.idEmprestimo ?? loan.id ?? index) + "-" + String(loan.idExemplar ?? index)} loan={loan} itemIndex={index} />)}
            </div> :
            <div className="user-loans-empty">
              <BookOpen size={50} strokeWidth={1.35} aria-hidden="true" />
              <h4>{pesquisa.trim() ? "Nenhum resultado para sua busca" : emptyTitle}</h4>
              <p>{pesquisa.trim() ? "Experimente outro título ou tombo." : emptyDescription}</p>
              {pesquisa.trim() ? <button type="button" className="user-loans-clear" onClick={() => setPesquisa("")}>Limpar busca</button> :
                <button type="button" className="user-loans-cta" onClick={() => navigate("/user/biblioteca")}><LibraryBig size={17} aria-hidden="true" /> Explorar livros</button>}
            </div>}
        </div>
        {!isLoading && !error && filtrados.length > 0 && (
          <div className="user-loans-panel__footer">Mostrando {filtrados.length} de {counts[filtro]} registros da categoria selecionada</div>
        )}
      </section>
    </div>
  );
}
