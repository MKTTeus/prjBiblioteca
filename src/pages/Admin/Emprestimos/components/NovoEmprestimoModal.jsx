import { useEffect, useRef, useState } from "react";
import { CiSearch } from "react-icons/ci";
import { HiOutlineX } from "react-icons/hi";
import { FiCheck, FiBookOpen, FiRepeat } from "react-icons/fi";
import LoadingButton from "../../../../components/LoadingButton/LoadingButton";
import ConfirmExitModal from "../../../../components/ConfirmExitModal/ConfirmExitModal";

function getIniciais(nome = "") {
  const partes = nome.trim().split(" ").filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export default function NovoEmprestimoModal({
  aberto,
  onFechar,
  buscaUsuario,
  onBuscaUsuarioChange,
  usuariosFiltrados,
  selecionado,
  onSelecionarUsuario,
  usuarioSelecionado,
  buscaExemplar,
  onBuscaExemplarChange,
  exemplaresFiltrados,
  onSelecionarExemplar,
  totalExemplaresDisponiveis = 0,
  onSalvar,
  salvando = false,
}) {
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const buscaUsuarioRef = useRef(null);
  const buscaExemplarRef = useRef(null);

  const isDirty = Boolean(selecionado.idUsuario || selecionado.idExemplar);

  useEffect(() => {
    if (!aberto) return;
    if (usuarioSelecionado) {
      buscaExemplarRef.current?.focus();
    } else {
      buscaUsuarioRef.current?.focus();
    }
  }, [aberto, usuarioSelecionado]);

  useEffect(() => {
    if (!aberto) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        if (isDirty) {
          setConfirmandoSaida(true);
        } else {
          onFechar();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aberto, isDirty, onFechar]);

  if (!aberto) return null;

  function handleRequestClose() {
    if (isDirty) {
      setConfirmandoSaida(true);
    } else {
      onFechar();
    }
  }

  function confirmarSaida() {
    setConfirmandoSaida(false);
    onFechar();
  }

  return (
    <div className="emp-modal-overlay" onClick={handleRequestClose}>
      <div className="emp-modal emp-modal-sequencial" onClick={(event) => event.stopPropagation()}>
        <div className="emp-modal-topbar">
          <h2>Novo Empréstimo</h2>
          <button className="emp-modal-close" onClick={handleRequestClose} aria-label="Fechar">
            <HiOutlineX />
          </button>
        </div>

        <div className="emp-modal-content">
          {usuarioSelecionado ? (
            <div className="emp-user-chip">
              <div className="emp-chip-avatar">{getIniciais(usuarioSelecionado.nome)}</div>
              <div className="emp-chip-info">
                <strong title={usuarioSelecionado.nome}>{usuarioSelecionado.nome}</strong>
                <span className="emp-chip-badge">{usuarioSelecionado.tipo}</span>
              </div>
              <button
                type="button"
                className="emp-chip-trocar"
                onClick={() => onSelecionarUsuario(null)}
              >
                <FiRepeat /> Trocar
              </button>
            </div>
          ) : (
            <section className="emp-step-card">
              <div className="emp-step-header">
                <div>
                  <span className="emp-step-number">1.</span>
                  <h3>Selecionar Usuário</h3>
                </div>
              </div>

              <div className="emp-step-search">
                <CiSearch />
                <input
                  ref={buscaUsuarioRef}
                  placeholder="Buscar usuário..."
                  value={buscaUsuario}
                  onChange={(event) => onBuscaUsuarioChange(event.target.value)}
                />
              </div>

              <div className="emp-list-box">
                {usuariosFiltrados.length === 0 ? (
                  <div className="emp-empty-state">Nenhum usuário encontrado.</div>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <button
                      type="button"
                      key={usuario.id}
                      className="emp-list-item"
                      onClick={() => onSelecionarUsuario(usuario.id)}
                    >
                      <div className="emp-list-main">
                        <strong>{usuario.nome}</strong>
                        <span className="emp-list-badge">{usuario.tipo}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          )}

          <section className={`emp-step-card ${!usuarioSelecionado ? "is-disabled" : ""}`}>
            <div className="emp-step-header">
              <div>
                <span className="emp-step-number">2.</span>
                <h3>Selecionar Exemplar</h3>
              </div>
              {usuarioSelecionado && (
                <span className="emp-step-subtitle">
                  {totalExemplaresDisponiveis}{" "}
                  {totalExemplaresDisponiveis === 1 ? "disponível" : "disponíveis"}
                </span>
              )}
            </div>

            {usuarioSelecionado ? (
              <>
                <div className="emp-step-search">
                  <CiSearch />
                  <input
                    ref={buscaExemplarRef}
                    placeholder="Buscar exemplar..."
                    value={buscaExemplar}
                    onChange={(event) => onBuscaExemplarChange(event.target.value)}
                  />
                </div>

                <div className="emp-list-box">
                  {exemplaresFiltrados.length === 0 ? (
                    <div className="emp-empty-state">Nenhum exemplar encontrado.</div>
                  ) : (
                    exemplaresFiltrados.map((exemplar) => {
                      const isSelecionado = selecionado.idExemplar === exemplar.id;
                      return (
                        <button
                          type="button"
                          key={exemplar.id}
                          className={`emp-list-item emp-list-item-exemplar ${
                            isSelecionado ? "selected" : ""
                          }`}
                          onClick={() => onSelecionarExemplar(exemplar.id)}
                        >
                          <FiBookOpen className="emp-list-icon" />
                          <div className="emp-list-main emp-list-main-column">
                            <strong>{exemplar.nome}</strong>
                            <small>Tombo: {exemplar.tombo || "-"}</small>
                            <small>ISBN: {exemplar.isbn || "-"}</small>
                          </div>
                          {isSelecionado && <FiCheck className="emp-list-check" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="emp-list-box emp-list-box-placeholder">
                <div className="emp-empty-state">Selecione um usuário primeiro</div>
              </div>
            )}
          </section>
        </div>

        <div className="emp-modal-actions">
          <button onClick={handleRequestClose}>Cancelar</button>
          <LoadingButton
            isLoading={salvando}
            loadingText="Salvando..."
            className="emp-confirmar"
            onClick={onSalvar}
            disabled={!selecionado.idUsuario || !selecionado.idExemplar || salvando}
          >
            Confirmar Empréstimo
          </LoadingButton>
        </div>
      </div>

      <ConfirmExitModal
        show={confirmandoSaida}
        onConfirm={confirmarSaida}
        onCancel={() => setConfirmandoSaida(false)}
        message="Você já selecionou usuário e/ou exemplar para este empréstimo. Se sair agora, a seleção será perdida."
      />
    </div>
  );
}