import "../../../components/AdminPageLayout/AdminPageLayout.css";
import React, { useEffect, useMemo, useState } from "react";
import { FaBell, FaCheckCircle, FaClock, FaUsers } from "react-icons/fa";
import { BellOff, CalendarDays, ChevronDown, Clock3, BookOpen, UserRound, IdCard, Phone } from "lucide-react";
import Skeleton from "../../../components/Skeleton/Skeleton";
import StatsCard from "../../../components/StatsCard/StatsCard";
import { getAdminNotifications } from "../../../services/api";
import { getErrorMessage } from "../../../utils/apiError";
import { formatarCPF, formatarTelefone } from "../../../utils/masks";
import "./Notificacoes.css";

const KEYS = ["atrasadosAlunos", "atrasadosComunidade", "atrasadosProfessores", "recentes", "devolucoesRecentes"];
const normalizar = (data) => Object.fromEntries(KEYS.map(key => [key, Array.isArray(data?.[key]) ? data[key] : []]));
const formatoData = value => {
  const d = typeof value === "string" ? value.slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.slice(8,10) + "/" + d.slice(5,7) + "/" + d.slice(0,4) : "Não informada";
};
const iniciais = nome => {
  const p = String(nome || "").trim().split(/\s+/).filter(Boolean);
  return (p.length > 1 ? p[0][0] + p[p.length-1][0] : (p[0] || "?").slice(0,2)).toUpperCase();
};
const statusTexto = item => item.tipo === "atraso"
  ? item.diasAtraso > 0 ? item.diasAtraso + (item.diasAtraso === 1 ? " dia em atraso" : " dias em atraso") : "Em atraso"
  : item.tipo === "retirada" ? "Retirada realizada" : "Devolução realizada";
const montarLista = dados => [
  ...dados.atrasadosAlunos.map((i, n) => ({...i, tipo:"atraso", chave:"a-"+(i.id ?? n)})),
  ...dados.atrasadosComunidade.map((i, n) => ({...i, tipo:"atraso", chave:"c-"+(i.id ?? n)})),
  ...dados.atrasadosProfessores.map((i, n) => ({...i, tipo:"atraso", chave:"p-"+(i.id ?? n)})),
  ...dados.recentes.map((i, n) => ({...i, tipo:"retirada", chave:"r-"+(i.id ?? n)})),
  ...dados.devolucoesRecentes.map((i, n) => ({...i, tipo:"devolucao", chave:"d-"+(i.id ?? n)})),
].sort((a,b) => {
  const ordem = {atraso:0, retirada:1, devolucao:2};
  return ordem[a.tipo]-ordem[b.tipo] || (a.tipo === "atraso" ? (b.diasAtraso||0)-(a.diasAtraso||0) : 0);
});
function Detail({ icon: Icon, label, value }) {
  if (!value && value !== 0) return null;
  return <div className="notif-detail"><Icon size={15} aria-hidden="true"/><div><dt>{label}</dt><dd>{value}</dd></div></div>;
}
function NotificationRow({ item, open, onToggle }) {
  const data = item.tipo === "devolucao" ? item.returnDate : item.tipo === "retirada" ? item.loanDate : item.dueDate;
  const tipoData = item.tipo === "atraso" ? "Prazo" : item.tipo === "retirada" ? "Retirada" : "Devolução";
  const turma = [item.serie, item.turma].filter(Boolean).join(" · ");
  const doc = item.userDocument ? item.userType === "Comunidade" ? formatarCPF(item.userDocument) : item.userDocument : null;
  const telefone = item.telefone && item.telefone !== "-" ? formatarTelefone(item.telefone) : null;
  const label = statusTexto(item);
  const id = "notif-" + String(item.chave).replace(/[^a-zA-Z0-9_-]/g,"-");
  return <article className={"notif-row" + (open ? " is-open" : "")}>
    <button type="button" className="notif-trigger" onClick={onToggle} aria-expanded={open} aria-controls={id}
      aria-label={(open ? "Recolher" : "Expandir") + " notificação de " + (item.userName || "leitor") + ", " + label}>
      <span className="notif-person"><span className="notif-avatar" aria-hidden="true">{iniciais(item.userName)}</span><span><strong>{item.userName || "Leitor não informado"}</strong><small>{[turma,item.userType].filter(Boolean).join(" · ")}</small></span></span>
      <span className="notif-book"><strong>{item.bookTitle || "Livro não informado"}</strong><small>Tombo: {item.tombo || "—"}</small></span>
      <span className="notif-date"><CalendarDays size={15} aria-hidden="true"/>{tipoData}: {formatoData(data)}</span>
      <span className={"notif-status notif-status--"+item.tipo}>{label}</span>
      <ChevronDown className="notif-arrow" size={17} aria-hidden="true"/>
    </button>
    {open && <div className="notif-expanded" id={id}><dl>
      <Detail icon={CalendarDays} label="Data do empréstimo" value={item.loanDate ? formatoData(item.loanDate) : null}/>
      <Detail icon={CalendarDays} label="Prazo de devolução" value={item.dueDate ? formatoData(item.dueDate) : null}/>
      <Detail icon={CalendarDays} label="Data da devolução" value={item.returnDate ? formatoData(item.returnDate) : null}/>
      {item.tipo === "atraso" && <Detail icon={Clock3} label="Dias em atraso" value={item.diasAtraso > 0 ? item.diasAtraso+" dias" : "Em atraso"}/>}
      <Detail icon={UserRound} label="Tipo de leitor" value={item.userType}/>
      <Detail icon={BookOpen} label="Série e turma" value={turma}/>
      <Detail icon={IdCard} label={item.userType === "Comunidade" ? "CPF" : "RA"} value={doc}/>
      <Detail icon={Phone} label="Telefone" value={telefone}/>
    </dl></div>}
  </article>;
}
const contaLeitores = lista => new Set(lista.map(i=>i.userId != null ? "id-"+i.userId : "nome-"+i.userName)).size;
export default function AdminNotificacoes() {
  const [dados,setDados] = useState(()=>normalizar({}));
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const [retry,setRetry] = useState(0);
  const [visible,setVisible] = useState(8);
  const [open,setOpen] = useState(()=>new Set());
  useEffect(()=>{
    let active = true;
    setLoading(true); setError(null);
    getAdminNotifications().then(data=>{if(active)setDados(normalizar(data));})
      .catch(err=>{if(active)setError(getErrorMessage(err,"Não foi possível carregar notificações."));})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[retry]);
  const lista = useMemo(()=>montarLista(dados),[dados]);
  const numero = n => loading || error ? "—" : n;
  const toggle = key => setOpen(prev=>{const next=new Set(prev);next.has(key)?next.delete(key):next.add(key);return next;});
  return <div className="admin-notificacoes page-shell admin-standard-page">
    <header className="admin-standard-header"><div><h1>Notificações do Admin</h1><p>Acompanhe empréstimos em atraso, retiradas e devoluções recentes.</p></div><FaBell className="notif-hero-icon" aria-hidden="true"/></header>
    <section className="stats-cards-grid admin-standard-kpis" aria-label="Resumo de notificações">
      <StatsCard title="Alunos em atraso" value={numero(contaLeitores(dados.atrasadosAlunos))} subtitle="Com empréstimos pendentes" icon={<FaClock/>} color="red"/>
      <StatsCard title="Comunidade em atraso" value={numero(contaLeitores(dados.atrasadosComunidade))} subtitle="Com empréstimos pendentes" icon={<FaUsers/>} color="orange"/>
      <StatsCard title="Retiradas hoje" value={numero(dados.recentes.length)} subtitle="Registradas hoje" icon={<FaBell/>} color="blue"/>
      <StatsCard title="Devoluções hoje" value={numero(dados.devolucoesRecentes.length)} subtitle="Registradas hoje" icon={<FaCheckCircle/>} color="green"/>
    </section>
    <section className="notif-list" aria-labelledby="notif-title">
      <header className="notif-heading"><div><h2 id="notif-title">Notificações recentes</h2><p>Empréstimos em atraso e movimentações registradas hoje.</p></div>{!loading && !error && <small>{lista.length} notificações</small>}</header>
      {loading ? <div className="notif-empty"><Skeleton variant="notifications"/></div> : error ? <div className="notif-empty" role="alert"><BellOff size={27}/><strong>Não foi possível carregar as notificações</strong><p>{error}</p><button onClick={()=>setRetry(v=>v+1)}>Tentar novamente</button></div> :
      lista.length === 0 ? <div className="notif-empty"><BellOff size={27}/><strong>Sem notificações no momento</strong><p>Não há empréstimos em atraso nem retiradas ou devoluções registradas hoje.</p></div> :
      <><div className="notif-items">{lista.slice(0,visible).map(i=><NotificationRow key={i.chave} item={i} open={open.has(i.chave)} onToggle={()=>toggle(i.chave)}/>)}</div>
      {visible<lista.length && <div className="notif-footer"><button type="button" onClick={()=>setVisible(n=>n+8)}>Mostrar mais notificações <ChevronDown size={14}/></button><small>Exibindo {Math.min(visible,lista.length)} de {lista.length}</small></div>}</>}
    </section>
  </div>;
}
