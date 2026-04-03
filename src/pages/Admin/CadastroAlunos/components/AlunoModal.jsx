import React from "react";
import { HiOutlineSave, HiOutlineX } from "react-icons/hi";

export default function AlunoModal({
  aberto,
  modoEdicao,
  aluno,
  isProcessing,
  isDirty,
  onChange,
  onClose,
  onSave,
}) {
  if (!aberto) return null;

  return (
    <div className="modal-overlay">
      <div className="editor-modal-container aluno-editor-modal">
        <div className="editor-shell aluno-editor-shell">
          <div className="editor-topbar aluno-editor-topbar">
            <div className="editor-topbar-copy">
              <h2>{modoEdicao ? "Editar Aluno" : "Cadastrar Novo Aluno"}</h2>
              <p>
                {modoEdicao
                  ? "Altere as informações do aluno seguindo o padrão visual dos modais de livros."
                  : "Preencha os dados do novo aluno usando o padrão visual do sistema."}
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
                    : "Criar Usuário"}
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

          <div className="editor-content aluno-editor-content">
            <div className="editor-section-grid aluno-editor-grid">
              <div className="editor-form-panel basic-column">
                <div className="basic-column-header">
                  <span>Dados principais</span>
                </div>

                <div className="editor-field-grid basic-column-grid">
                  <label className="editor-field">
                    <span>Nome Completo *</span>
                    <input
                      name="nome"
                      value={aluno.nome}
                      onChange={onChange}
                      placeholder="Digite o nome completo do aluno"
                    />
                  </label>

                  <label className="editor-field">
                    <span>RA *</span>
                    <input
                      name="ra"
                      value={aluno.ra}
                      onChange={onChange}
                      placeholder="Informe o RA do aluno"
                    />
                  </label>

                  <label className="editor-field">
                    <span>E-mail</span>
                    <input
                      name="email"
                      value={aluno.email}
                      onChange={onChange}
                      placeholder="aluno@escola.com"
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
                      value={aluno.telefone}
                      onChange={onChange}
                      placeholder="(00) 00000-0000"
                    />
                  </label>

                  <label className="editor-field">
                    <span>Telefone 2</span>
                    <input
                      name="telefone2"
                      value={aluno.telefone2}
                      onChange={onChange}
                      placeholder="Contato do responsável"
                    />
                  </label>

                  <label className="editor-field">
                    <span>Senha *</span>
                    <input
                      type="password"
                      name="senha"
                      value={aluno.senha}
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

              <div className="editor-side-panel basic-cover-column aluno-side-panel">
                <div className="basic-column-header">
                  <span>Status e localização</span>
                </div>

                <div className="cover-uploader aluno-side-card">
                  <label className="editor-field">
                    <span>Endereço *</span>
                    <input
                      name="endereco"
                      value={aluno.endereco}
                      onChange={onChange}
                      placeholder="Rua, número e complemento"
                    />
                  </label>

                  <label className="editor-field">
                    <span>Status</span>
                    <select
                      name="status"
                      value={aluno.status}
                      onChange={onChange}
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </label>

                  <div className="publication-highlight-card aluno-highlight-card">
                    <div>
                      <strong>{modoEdicao ? "Edição do cadastro" : "Novo cadastro"}</strong>
                      <p>
                        {modoEdicao
                          ? "Revise os dados antes de salvar para manter o cadastro de alunos consistente."
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
