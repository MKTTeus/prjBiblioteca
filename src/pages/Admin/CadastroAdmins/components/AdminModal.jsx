import React from "react";
import { HiOutlineSave, HiOutlineX } from "react-icons/hi";

export default function AdminModal({
  aberto,
  modoEdicao,
  admin,
  isProcessing,
  isDirty,
  onChange,
  onClose,
  onSave,
}) {
  if (!aberto) return null;

  return (
    <div className="modal-overlay">
      <div className="editor-modal-container admin-editor-modal">
        <div className="editor-shell admin-editor-shell">
          <div className="editor-topbar admin-editor-topbar">
            <div className="editor-topbar-copy">
              <h2>{modoEdicao ? "Editar Administrador" : "Cadastrar Novo Administrador"}</h2>
              <p>
                {modoEdicao
                  ? "Altere as informações do administrador seguindo o padrão visual dos modais de alunos."
                  : "Preencha os dados do novo administrador usando o padrão visual do sistema."}
              </p>
            </div>

            <div className="editor-top-actions">
              <button
                type="button"
                className="top-action primary"
                onClick={onSave}
                disabled={isProcessing || (modoEdicao && !isDirty)}
              >
                <HiOutlineSave />
                <span>
                  {isProcessing
                    ? "Processando..."
                    : modoEdicao
                    ? "Salvar Alterações"
                    : "Criar Administrador"}
                </span>
              </button>

              <button
                type="button"
                className="editor-close-button"
                onClick={onClose}
                aria-label="Fechar"
              >
                <HiOutlineX />
              </button>
            </div>
          </div>

          <div className="editor-divider" />

          <div className="editor-content admin-editor-content">
            <div className="editor-section-grid admin-editor-grid">
              <div className="editor-form-panel basic-column">
                <div className="basic-column-header">
                  <span>Dados principais</span>
                </div>

                <div className="editor-field-grid basic-column-grid">
                  <label className="editor-field">
                    <span>Nome *</span>
                    <input
                      name="nome"
                      value={admin.nome}
                      onChange={onChange}
                      placeholder="Digite o nome do administrador"
                    />
                  </label>

                  <label className="editor-field">
                    <span>E-mail</span>
                    <input
                      name="email"
                      value={admin.email}
                      onChange={onChange}
                      placeholder="admin@sistema.com"
                    />
                  </label>
                </div>
              </div>

              <div className="editor-form-panel basic-column">
                <div className="basic-column-header">
                  <span>Acesso e status</span>
                </div>

                <div className="editor-field-grid basic-column-grid">
                  <label className="editor-field">
                    <span>Senha *</span>
                    <input
                      type="password"
                      name="senha"
                      value={admin.senha}
                      onChange={onChange}
                      disabled={modoEdicao}
                      min={6}
                      placeholder={
                        modoEdicao
                          ? "Senha bloqueada durante a edição"
                          : "Mínimo de 6 caracteres"
                      }
                    />
                  </label>

                  <label className="editor-field">
                    <span>Status</span>
                    <select
                      name="status"
                      value={admin.status}
                      onChange={onChange}
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="editor-side-panel basic-cover-column admin-side-panel">
                <div className="basic-column-header">
                  <span>Resumo do cadastro</span>
                </div>

                <div className="cover-uploader admin-side-card">
                  <div className="publication-highlight-card admin-highlight-card">
                    <div>
                      <strong>{modoEdicao ? "Edição do cadastro" : "Novo cadastro"}</strong>
                      <p>
                        {modoEdicao
                          ? "Revise as informações antes de salvar para manter o cadastro de administradores consistente."
                          : "Confirme nome, e-mail e permissão ativa para concluir o cadastro."}
                      </p>
                    </div>
                  </div>

                  <div className="publication-highlight-card admin-highlight-card">
                    <div>
                      <strong>Status atual</strong>
                      <p>
                        {admin.status === "Ativo"
                          ? "Este administrador poderá acessar as áreas protegidas do sistema."
                          : "Este administrador permanecerá sem acesso até ser reativado."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
