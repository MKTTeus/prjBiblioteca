import { CiSearch } from "react-icons/ci";
import { HiOutlineX } from "react-icons/hi";

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
  resumoUsuario,
  resumoExemplar,
  onSalvar,
}) {
  if (!aberto) return null;

  return (
    <div className="emp-modal-overlay" onClick={onFechar}>
      <div className="emp-modal emp-modal-sequencial" onClick={(event) => event.stopPropagation()}>
        <div className="emp-modal-topbar">
          <h2>Novo Empréstimo</h2>
          <button className="emp-modal-close" onClick={onFechar} aria-label="Fechar">
            <HiOutlineX />
          </button>
        </div>

        <div className="emp-modal-content">
          <div className="emp-modal-grid">
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
                      className={`emp-list-item ${
                        selecionado.idUsuario === usuario.id ? "selected" : ""
                      }`}
                      onClick={() => onSelecionarUsuario(usuario.id)}
                    >
                      <div className="emp-list-main">
                        <strong>{usuario.nome}</strong>
                        <small>
                          {usuario.tipo === "Aluno"
                            ? `RA: ${usuario.documento || "-"}`
                            : `CPF: ${usuario.documento || "-"}`}
                        </small>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className={`emp-step-card ${!usuarioSelecionado ? "is-disabled" : ""}`}>
              <div className="emp-step-header">
                <div>
                  <span className="emp-step-number">2.</span>
                  <h3>Selecionar Exemplar</h3>
                </div>
              </div>

              {usuarioSelecionado ? (
                <>
                  <div className="emp-step-search">
                    <CiSearch />
                    <input
                      placeholder="Buscar exemplar..."
                      value={buscaExemplar}
                      onChange={(event) => onBuscaExemplarChange(event.target.value)}
                    />
                  </div>

                  <div className="emp-list-box">
                    {exemplaresFiltrados.length === 0 ? (
                      <div className="emp-empty-state">Nenhum exemplar encontrado.</div>
                    ) : (
                      exemplaresFiltrados.map((exemplar) => (
                        <button
                          type="button"
                          key={exemplar.id}
                          className={`emp-list-item ${
                            selecionado.idExemplar === exemplar.id ? "selected" : ""
                          }`}
                          onClick={() => onSelecionarExemplar(exemplar.id)}
                        >
                          <div className="emp-list-main">
                            <strong>{exemplar.nome}</strong>
                            <small>Tombo: {exemplar.tombo || "-"}</small>
                          </div>
                        </button>
                      ))
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
        </div>

        <section className="emp-summary-card emp-summary-card-fixed">
          <h3>Resumo da seleção</h3>

          <div className="emp-summary-row">
            <span>Usuário</span>
            <strong title={resumoUsuario}>{resumoUsuario}</strong>
          </div>

          <div className="emp-summary-row">
            <span>Exemplar</span>
            <strong title={resumoExemplar}>{resumoExemplar}</strong>
          </div>
        </section>

        <div className="emp-modal-actions">
          <button onClick={onFechar}>Cancelar</button>
          <button
            className="emp-confirmar"
            onClick={onSalvar}
            disabled={!selecionado.idUsuario || !selecionado.idExemplar}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
