import Skeleton from "../../../../components/Skeleton/Skeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiBookOpen, FiCheck, FiSearch, FiX, FiUser } from "react-icons/fi";
import LoadingButton from "../../../../components/LoadingButton/LoadingButton";
import { getBooks } from "../../../../services/api";
import ConfirmExitModal from "../../../../components/ConfirmExitModal/ConfirmExitModal";

const initials = (name = "") => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
const studentGroup = (user) => [user?.serie, user?.turma].filter(Boolean).join(" · ");
const dueDate = (days) => {
  if (!Number.isFinite(Number(days)) || Number(days) <= 0) return null;
  const date = new Date();
  date.setDate(date.getDate() + Number(days));
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};

// Mantém o ícone atual como fallback para livros sem capa ou imagens indisponíveis.
function ExemplarCapa({ url }) {
  const [falha, setFalha] = useState(false);
  useEffect(() => setFalha(false), [url]);

  return (
    <span className={`emp-new-book ${url && !falha ? "has-cover" : ""}`}>
      {url && !falha ? (
        <img src={url} alt="" loading="lazy" onError={() => setFalha(true)} />
      ) : (
        <FiBookOpen />
      )}
    </span>
  );
}

export default function NovoEmprestimoModal({
  aberto, onFechar, buscaUsuario, onBuscaUsuarioChange, usuariosFiltrados,
  selecionado, onSelecionarUsuario, usuarioSelecionado, buscaExemplar,
  onBuscaExemplarChange, exemplaresFiltrados, onSelecionarExemplar,
  totalExemplaresDisponiveis = 0, onSalvar, salvando = false, diasEmprestimo = null, carregandoPrazoEmprestimo = false,
}) {
  const [step, setStep] = useState(1);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [serie, setSerie] = useState("");
  const [capasPorLivro, setCapasPorLivro] = useState({});
  const [capasConsultadas, setCapasConsultadas] = useState(false);
  const buscaRef = useRef(null);
  const isDirty = Boolean(selecionado.idUsuario || selecionado.idExemplar);
  const selectedCopy = exemplaresFiltrados.find((copy) => String(copy.id) === String(selecionado.idExemplar));
  const series = useMemo(() => Array.from(new Set(usuariosFiltrados.filter((u) => u.tipo === "Aluno" && u.serie).map((u) => String(u.serie)))).sort((a,b) => a.localeCompare(b,"pt-BR")), [usuariosFiltrados]);
  const visibleUsers = useMemo(() => usuariosFiltrados.filter((u) => !serie || String(u.serie) === serie), [usuariosFiltrados, serie]);
  const validSelection = Boolean(selecionado.idUsuario && selecionado.idExemplar);

  useEffect(() => { if (aberto) { setStep(1); setSerie(""); setConfirmandoSaida(false); } }, [aberto]);
  // A lista de exemplares traz idLivro; as capas já estão disponíveis no catálogo existente.
  // Esta consulta é opcional e não interfere na seleção ou no registro do empréstimo.
  useEffect(() => {
    if (!aberto || step !== 2 || capasConsultadas) return undefined;
    let ativo = true;
    getBooks()
      .then((livros) => {
        if (!ativo) return;
        const capas = {};
        for (const livro of Array.isArray(livros) ? livros : []) {
          if (livro?.idLivro != null && livro?.livCapaURL) {
            capas[String(livro.idLivro)] = livro.livCapaURL;
          }
        }
        setCapasPorLivro(capas);
        setCapasConsultadas(true);
      })
      .catch(() => {
        if (ativo) setCapasConsultadas(true);
      });
    return () => { ativo = false; };
  }, [aberto, step, capasConsultadas]);
  useEffect(() => { if (aberto && step !== 3) buscaRef.current?.focus(); }, [aberto, step]);
  useEffect(() => {
    if (!aberto) return undefined;
    function onKey(event) { if (event.key === "Escape" && !confirmandoSaida && !salvando) { event.preventDefault(); if (isDirty) setConfirmandoSaida(true); else onFechar(); } }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, confirmandoSaida, salvando, isDirty, onFechar]);

  if (!aberto) return null;
  const requestClose = () => { if (salvando) return; if (isDirty) setConfirmandoSaida(true); else onFechar(); };
  const next = () => { if (step === 1 && usuarioSelecionado) setStep(2); if (step === 2 && validSelection) setStep(3); };
  const changeUser = () => { onSelecionarUsuario(null); setStep(1); };
  const steps = ["Selecionar usuário", "Escolher exemplar", "Confirmar"];
  return (
    <div className="emp-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}>
      <div className="emp-modal emp-modal-sequencial emp-modal-novo" role="dialog" aria-modal="true" aria-labelledby="emp-modal-title">
        <div className="emp-modal-topbar">
          <div className="emp-modal-title-group">
            <h2 id="emp-modal-title">Novo Empréstimo</h2>
            <p>Escolha o usuário, o exemplar e confirme os dados.</p>
          </div>
          <button type="button" className="emp-modal-close" onClick={requestClose} disabled={salvando} aria-label="Fechar"><FiX /></button>
        </div>
        <div className="emp-new-steps" aria-label="Etapas do empréstimo">
          {steps.map((name, index) => <div key={name} className={`emp-new-step ${step === index + 1 ? "is-current" : ""} ${step > index + 1 ? "is-complete" : ""}`} aria-current={step === index + 1 ? "step" : undefined}><span>{step > index + 1 ? <FiCheck /> : index + 1}</span><strong>{name}</strong></div>)}
        </div>
        <div className="emp-modal-content emp-new-content">
          {step === 1 && <section className="emp-new-section">
            <div className="emp-new-section-title"><h3>Selecionar usuário</h3><span>{visibleUsers.length} resultado(s)</span></div>
            <p className="emp-new-help">Identifique o aluno pelo nome completo, série, turma e RA. Usuários da comunidade também estão disponíveis.</p>
            <div className="emp-step-search"><FiSearch /><input ref={buscaRef} aria-label="Buscar usuário" placeholder="Nome, RA, CPF, série ou turma..." value={buscaUsuario} onChange={(e) => onBuscaUsuarioChange(e.target.value)} /></div>
            {series.length > 0 && <div className="emp-new-series"><label htmlFor="emp-serie">Série</label><select id="emp-serie" value={serie} onChange={(e) => setSerie(e.target.value)}><option value="">Todas as séries</option>{series.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>}
            <div className="emp-list-box emp-new-results" role="listbox" aria-label="Usuários encontrados">
              {visibleUsers.length ? visibleUsers.map((u) => <button type="button" role="option" aria-selected={String(u.id) === String(selecionado.idUsuario)} key={u.id} className={`emp-list-item emp-new-result ${String(u.id) === String(selecionado.idUsuario) ? "selected" : ""}`} onClick={() => { onSelecionarUsuario(u.id); setStep(2); }}>
                <span className="emp-new-avatar">{initials(u.nome)}</span><span className="emp-new-result-text"><strong>{u.nome}</strong><small>{u.tipo === "Aluno" ? [studentGroup(u), u.documento ? `RA: ${u.documento}` : "RA não informado"].filter(Boolean).join(" · ") : `Comunidade · CPF: ${u.documento || "Não informado"}`}</small></span><span className="emp-new-result-check"><FiCheck /></span>
              </button>) : <div className="emp-empty-state">Nenhum usuário encontrado. Tente outro nome, documento ou série.</div>}
            </div>
          </section>}
          {step === 2 && <section className="emp-new-section">
            <div className="emp-new-section-title"><h3>Selecionar exemplar</h3><span>{totalExemplaresDisponiveis} disponíveis</span></div>
            <div className="emp-user-chip"><span className="emp-new-avatar">{initials(usuarioSelecionado?.nome)}</span><span className="emp-chip-info"><strong>{usuarioSelecionado?.nome}</strong><small>{usuarioSelecionado?.tipo === "Aluno" ? [studentGroup(usuarioSelecionado), `RA: ${usuarioSelecionado?.documento || "Não informado"}`].filter(Boolean).join(" · ") : "Comunidade"}</small></span><button type="button" className="emp-chip-trocar" onClick={changeUser}>Trocar</button></div>
            <div className="emp-step-search"><FiSearch /><input ref={buscaRef} aria-label="Buscar exemplar" placeholder="Título, autor, ISBN ou tombo..." value={buscaExemplar} onChange={(e) => onBuscaExemplarChange(e.target.value)} /></div>
            <div className="emp-list-box emp-new-results" role="listbox" aria-label="Exemplares disponíveis">
              {exemplaresFiltrados.length ? exemplaresFiltrados.map((copy) => <button key={copy.id} type="button" role="option" aria-selected={String(copy.id) === String(selecionado.idExemplar)} className={`emp-list-item emp-new-result ${String(copy.id) === String(selecionado.idExemplar) ? "selected" : ""}`} onClick={() => { onSelecionarExemplar(copy.id); setStep(3); }}>
                <ExemplarCapa url={capasPorLivro[String(copy.idLivro)]} /><span className="emp-new-result-text"><strong>{copy.nome}</strong><small>Tombo: {copy.tombo || "—"} · ISBN: {copy.isbn || "—"}</small><small className="emp-new-available">Disponível para empréstimo</small></span><span className="emp-new-result-check"><FiCheck /></span>
              </button>) : <div className="emp-empty-state">Nenhum exemplar disponível corresponde à pesquisa.</div>}
            </div>
          </section>}
          {step === 3 && <section className="emp-new-section">
            <div className="emp-new-section-title"><h3>Revisar e confirmar</h3><span>Etapa final</span></div>
            <p className="emp-new-help">Confira os dados antes de realizar o empréstimo.</p>
            <div className="emp-new-summary"><div><span><FiUser /> Usuário</span><strong>{usuarioSelecionado?.nome || "—"}</strong><small>{usuarioSelecionado?.tipo === "Aluno" ? [studentGroup(usuarioSelecionado), `RA: ${usuarioSelecionado?.documento || "Não informado"}`].filter(Boolean).join(" · ") : "Comunidade"}</small></div><div><span><FiBookOpen /> Exemplar</span><strong>{selectedCopy?.nome || "—"}</strong><small>Tombo: {selectedCopy?.tombo || "—"} · ISBN: {selectedCopy?.isbn || "—"}</small></div><div><span>Previsão de devolução</span><strong>{carregandoPrazoEmprestimo ? <Skeleton variant="inline" /> : dueDate(diasEmprestimo) || "Prazo indisponível"}</strong><small>{diasEmprestimo ? `Prazo padrão de ${diasEmprestimo} ${diasEmprestimo === 1 ? "dia" : "dias"}, definido nas Configurações da biblioteca.` : carregandoPrazoEmprestimo ? "Consultando as configurações da biblioteca." : "Não foi possível consultar o prazo. O sistema aplicará a configuração vigente ao registrar."}</small></div></div>
            {!validSelection && <p role="alert" className="emp-renovar-erro">Selecione um usuário e um exemplar disponível.</p>}
          </section>}
        </div>
        <div className="emp-modal-actions emp-new-actions">
          <button type="button" onClick={step === 1 ? requestClose : () => setStep(step - 1)} disabled={salvando}>{step === 1 ? "Cancelar" : <><FiArrowLeft /> Voltar</>}</button>
          {step < 3 ? <button type="button" className="emp-confirmar" disabled={step === 1 ? !usuarioSelecionado : !validSelection} onClick={next}>Continuar <FiArrowRight /></button> : <LoadingButton isLoading={salvando} loadingText="Registrando..." className="emp-confirmar" onClick={onSalvar} disabled={!validSelection || salvando}>Confirmar Empréstimo</LoadingButton>}
        </div>
      </div>
      <ConfirmExitModal show={confirmandoSaida} onConfirm={() => { setConfirmandoSaida(false); onFechar(); }} onCancel={() => setConfirmandoSaida(false)} message="Sua seleção será perdida se sair agora." />
    </div>
  );
}
