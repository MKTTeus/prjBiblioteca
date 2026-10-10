import React, { useEffect, useState } from "react";
import { FiClock, FiCheckCircle, FiAlertCircle, FiUser, FiUsers } from "react-icons/fi";
import Modal from "../../../components/Modal/Modal";
import { useToast } from "../../../contexts/ToastContext";
import { getEmprestimosProfessor, devolverEmprestimoProfessor } from "../../../services/api";
import { getErrorMessage } from "../../../utils/apiError";
import "../../user/UserArea.css";
import "./MeusEmprestimos.css";

const STATUS_LABEL = {
  Ativo: "Ativo",
  Atrasado: "Atrasado",
  Pendente: "Aguardando aprovação",
  "Aguardando retirada": "Aguardando retirada",
  Negado: "Negado",
  Expirada: "Expirada",
  Devolvido: "Devolvido",
};

const STATUS_CLASSE = {
  Ativo: "ativo",
  Atrasado: "atrasado",
  Pendente: "pendente",
  "Aguardando retirada": "pendente",
  Negado: "negado",
  Expirada: "expirada",
  Devolvido: "devolvido",
};

export default function MeusEmprestimos() {
  const { addToast } = useToast();
  const [emprestimos, setEmprestimos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const [idsDevolucao, setIdsDevolucao] = useState([]);
  const [devolvendo, setDevolvendo] = useState(false);

  async function carregar({ mostrarLoading } = { mostrarLoading: true }) {
    if (mostrarLoading) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const data = await getEmprestimosProfessor();
      setEmprestimos(Array.isArray(data) ? data : []);
    } catch (err) {
      if (mostrarLoading) {
        setError("Erro ao carregar seus empréstimos. Tente novamente.");
        setEmprestimos([]);
      }
    } finally {
      if (mostrarLoading) setIsLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    const interval = setInterval(() => carregar({ mostrarLoading: false }), 15000);
    return () => clearInterval(interval);
  }, []);

  const ativos = emprestimos.filter((e) => e.status === "Ativo");
  const atrasados = emprestimos.filter((e) => e.status === "Atrasado");
  const aguardando = emprestimos.filter((e) => e.status === "Pendente" || e.status === "Aguardando retirada");
  const devolvidos = emprestimos.filter((e) => e.status === "Devolvido" || e.status === "Negado" || e.status === "Expirada");

  const abrirDetalhes = (emprestimo) => {
    setSelecionado(emprestimo);
    setIdsDevolucao([]);
  };

  const fecharDetalhes = () => {
    if (devolvendo) return;
    setSelecionado(null);
    setIdsDevolucao([]);
  };

  const confirmarDevolucao = async () => {
    if (!selecionado) return;
    if (idsDevolucao.length === 0) {
      addToast("Selecione os tombos que foram devolvidos.", "error");
      return;
    }
    setDevolvendo(true);
    try {
      await devolverEmprestimoProfessor(selecionado.idMovimentacao, idsDevolucao);
      addToast("Devolução registrada com sucesso.", "success");
      fecharDetalhes();
      carregar({ mostrarLoading: false });
    } catch (err) {
      addToast(getErrorMessage(err, "Erro ao registrar devolução"), "error");
    } finally {
      setDevolvendo(false);
    }
  };

  const renderLista = (items, mensagemVazia) => {
    if (isLoading) return <div className="user-empty-state">Carregando empréstimos...</div>;
    if (error) return <div className="user-empty-state">{error}</div>;
    if (items.length === 0) return <div className="user-empty-state">{mensagemVazia}</div>;

    return (
      <div className="user-loans-list">
        {items.map((emp) => (
          <article
            key={emp.idMovimentacao}
            className="user-loan-item professor-loan-item"
            onClick={() => abrirDetalhes(emp)}
          >
            <div className="user-loan-item__top">
              <div>
                <h4>
                  {emp.finalidade === "TURMA" ? <FiUsers /> : <FiUser />}{" "}
                  {emp.finalidade === "TURMA"
                    ? [emp.serie, emp.turma].filter(Boolean).join(" - ") || "Turma"
                    : "Empréstimo pessoal"}
                </h4>
                <small>Empréstimo #{emp.idMovimentacao}</small>
              </div>
              <span className={`status-badge ${STATUS_CLASSE[emp.status] || ""}`}>
                {STATUS_LABEL[emp.status] || emp.status}
              </span>
            </div>
            <p>Data do empréstimo: {emp.dataEmprestimo || "-"}</p>
            <p>Prazo: {emp.dataPrevistaDevolucao || "-"}</p>
            <p>
              {emp.totalLivros} livro(s) / {emp.totalExemplares} exemplar(es)
              {emp.totalDevolvidos > 0 ? ` — ${emp.totalDevolvidos} já devolvido(s)` : ""}
            </p>
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="user-page page-shell">
      <section className="user-page__hero">
        <div className="user-page__hero-content">
          <h2>Meus empréstimos</h2>
          <p>Acompanhe e devolva os livros retirados para você ou para suas turmas.</p>
        </div>
      </section>

      <section className="user-loans-grid">
        <div className="user-section-card user-loans-column">
          <div className="user-section-card__header user-section-card__header--ativo">
            <FiCheckCircle className="user-section-card__header-icon" />
            <h3>Ativos</h3>
            {!isLoading && ativos.length > 0 && (
              <span className="user-section-count user-section-count--ativo">{ativos.length}</span>
            )}
          </div>
          {renderLista(ativos, "Nenhum empréstimo ativo no momento.")}
        </div>

        <div className="user-section-card user-loans-column">
          <div className="user-section-card__header user-section-card__header--atrasado">
            <FiAlertCircle className="user-section-card__header-icon" />
            <h3>Atrasados</h3>
            {!isLoading && atrasados.length > 0 && (
              <span className="user-section-count user-section-count--atrasado">{atrasados.length}</span>
            )}
          </div>
          {renderLista(atrasados, "Nenhum empréstimo atrasado.")}
        </div>

        <div className="user-section-card user-loans-column">
          <div className="user-section-card__header user-section-card__header--pendente">
            <FiClock className="user-section-card__header-icon" />
            <h3>Aguardando aprovação</h3>
            {!isLoading && aguardando.length > 0 && (
              <span className="user-section-count user-section-count--pendente">{aguardando.length}</span>
            )}
          </div>
          {renderLista(aguardando, "Nenhuma solicitação aguardando aprovação ou retirada.")}
        </div>

        <div className="user-section-card user-loans-column">
          <div className="user-section-card__header user-section-card__header--pendente">
            <FiClock className="user-section-card__header-icon" />
            <h3>Histórico</h3>
            {!isLoading && devolvidos.length > 0 && (
              <span className="user-section-count user-section-count--pendente">{devolvidos.length}</span>
            )}
          </div>
          {renderLista(devolvidos, "Nenhum empréstimo finalizado ainda.")}
        </div>
      </section>

      <Modal show={!!selecionado} onClose={fecharDetalhes} className="professor-detalhe-modal">
        {selecionado && (
          <div className="professor-detalhe">
            <h3>Empréstimo #{selecionado.idMovimentacao}</h3>
            <p className="professor-detalhe__subtitulo">
              {selecionado.finalidade === "TURMA"
                ? `Turma: ${[selecionado.serie, selecionado.turma].filter(Boolean).join(" - ")}`
                : "Empréstimo pessoal"}
              {" · "}Prazo: {selecionado.dataPrevistaDevolucao || "-"}
            </p>

            <div className="professor-detalhe__lista">
              {selecionado.livros.map((livro) => (
                <div key={livro.idLivro} className="professor-detalhe__linha">
                  <div className="professor-detalhe__linha-info">
                    <strong>{livro.titulo}</strong>
                    <span>
                      {livro.ativos} ativo(s){livro.devolvidos > 0 ? ` · ${livro.devolvidos} devolvido(s)` : ""}
                    </span>
                  </div>
                  {(selecionado.exemplares || []).filter((ex) => ex.idLivro === livro.idLivro && ex.itemStatus === "Ativo").map((ex) => (
                    <label key={ex.idExemplar}>
                      <input type="checkbox" disabled={devolvendo} checked={idsDevolucao.includes(ex.idExemplar)}
                        onChange={(event) => setIdsDevolucao((ids) => event.target.checked ? [...ids, ex.idExemplar] : ids.filter((id) => id !== ex.idExemplar))} />
                      Devolver tombo {ex.tombo}
                    </label>
                  ))}
                </div>
              ))}
            </div>

            {(selecionado.status === "Ativo" || selecionado.status === "Atrasado") && (
              <button
                type="button"
                className="professor-btn professor-btn--primary"
                onClick={confirmarDevolucao}
                disabled={devolvendo}
              >
                {devolvendo ? "Registrando..." : "Confirmar devolução"}
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}