import React from "react";
import { HiOutlineSave, HiOutlineX } from "react-icons/hi";

export default function ComunidadeModal({
  aberto,
  modoEdicao,
  membro,
  isProcessing,
  isDirty,
  maxCPFLength,
  onChange,
  onClose,
  onSave,
}) {
  if (!aberto) return null;

  return (
    <div className="modal-overlay">
      <div className="editor-modal-container comunidade-editor-modal">
        <div className="editor-shell comunidade-editor-shell">
          <div className="editor-topbar comunidade-editor-topbar">
            <div className="editor-topbar-copy">
              <h2>{modoEdicao ? "Editar Membro" : "Cadastrar Novo Membro"}</h2>
              <p>
                {modoEdicao
                  ? "Altere as informações do membro seguindo o padrão visual dos modais de alunos."
                  : "Preencha os dados do novo membro usando o padrão visual do sistema."}
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
                      : "Criar Membro"}
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

          <div className="editor-content comunidade-editor-content">
            <div className="editor-section-grid comunidade-editor-grid">
              <div className="editor-form-panel basic-column">
                <div className="basic-column-header">
                  <span>Dados principais</span>
                </div>

                <div className="editor-field-grid basic-column-grid">
                  <label className="editor-field">
                    <span>Nome Completo *</span>
                    <input
                      name="nome"
                      value={membro.nome}
                      onChange={onChange}
                      placeholder="Digite o nome completo do membro"
                    />
                  </label>

                  <label className="editor-field">
                    <span>CPF *</span>
                    <input
                      name="cpf"
                      value={membro.cpf}
                      onChange={onChange}
                      placeholder="Informe o CPF"
                      minLength={11}
                      maxLength={maxCPFLength}
                    />
                  </label>

                  <label className="editor-field">
                    <span>E-mail</span>
                    <input
                      name="email"
                      value={membro.email}
                      onChange={onChange}
                      placeholder="membro@comunidade.com"
                    />
                  </label>
                </div>
              </div>

              <div className="editor-form-panel basic-column">
                <div className="basic-column-header">
                  <span>Contato e acesso</span>
                </div>

                <div className="editor-field-grid basic-column-grid">
                  <label className="editor-field">
                    <span>Telefone</span>
                    <input
                      name="telefone"
                      value={membro.telefone}
                      onChange={onChange}
                      placeholder="(00) 00000-0000"
                    />
                  </label>

                  <label className="editor-field">
                    <span>Telefone 2</span>
                    <input
                      name="telefone2"
                      value={membro.telefone2}
                      onChange={onChange}
                      placeholder="Contato alternativo"
                    />
                  </label>

                  <label className="editor-field">
                    <span>Senha *</span>
                    <input
                      type="password"
                      name="senha"
                      value={membro.senha}
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
                </div>
              </div>

              <div className="editor-side-panel basic-cover-column comunidade-side-panel">
                <div className="basic-column-header">
                  <span>Status e localização</span>
                </div>

                <div className="cover-uploader comunidade-side-card">
                  <label className="editor-field">
                    <span>Endereço *</span>
                    <input
                      name="endereco"
                      value={membro.endereco}
                      onChange={onChange}
                      placeholder="Rua, número e complemento"
                    />
                  </label>

                  <label className="editor-field">
                    <span>Status</span>
                    <select name="status" value={membro.status} onChange={onChange}>
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </label>

                  <div className="publication-highlight-card comunidade-highlight-card">
                    <div>
                      <strong>{modoEdicao ? "Edição do cadastro" : "Novo cadastro"}</strong>
                      <p>
                        {modoEdicao
                          ? "Revise os dados antes de salvar para manter o cadastro da comunidade consistente."
                          : "Confira os dados obrigatórios para concluir o cadastro sem retrabalho."}
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
