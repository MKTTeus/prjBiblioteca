import React, { useState } from "react";
import "../UserArea.css";
import "./Configuracoes.css";

export default function ConfiguracoesUser() {
  // mock data
  const mock = {
    nome: "João da Silva",
    email: "joao.silva@escola.edu",
    ra: "202312345",
    cpf: "",
    dataNascimento: "2005-04-13",
    endereco: "Rua das Flores, 123, Bairro Jardim",
    telefone: "(11) 98765-4321",
    telefoneResponsavel: "(11) 91234-5678",
    tema: "dark",
  };

  const [endereco, setEndereco] = useState(mock.endereco);
  const [telefone, setTelefone] = useState(mock.telefone);
  const [telefoneResp, setTelefoneResp] = useState(mock.telefoneResponsavel);
  const [temaLocal, setTemaLocal] = useState(mock.tema === "dark");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");

  return (
    <div className="user-page page-shell user-config-page">
      <div className="top-bar">
        <div>
          <h1>Configurações</h1>
          <p>Gerencie suas informações pessoais, aparência e segurança.</p>
        </div>
      </div>

      <div className="user-config-cards">
        <div className="left-col">
          <div className="card">
            <div className="geral-header">
              <h3>Dados Pessoais</h3>
            </div>

            <div className="form-grid three-col">
              <div className="form-group">
                <label>Nome</label>
                <input value={mock.nome} disabled aria-disabled="true" />
              </div>

              <div className="form-group">
                <label>RA / CPF</label>
                <input value={mock.ra || mock.cpf} disabled aria-disabled="true" />
              </div>

              <div className="form-group">
                <label>Data de nascimento</label>
                <input value={mock.dataNascimento} disabled aria-disabled="true" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="geral-header">
              <h3>Informações de Contato</h3>
            </div>

            <div className="form-grid">
              <div className="form-group full">
                <label>Endereço</label>
                <input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Telefone</label>
                <input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>

              {mock.telefoneResponsavel ? (
                <div className="form-group">
                  <label>Telefone do Responsável</label>
                  <input value={telefoneResp} onChange={(e) => setTelefoneResp(e.target.value)} />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="right-col">
          <div className="card">
            <div className="geral-header">
              <h3>Aparência</h3>
            </div>

            <div className="form-grid">
              <div className="form-group switch-section full">
                <label className="section-label">Tema</label>

                <div className="control-row">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={temaLocal}
                      onChange={(e) => setTemaLocal(e.target.checked)}
                      aria-label="Alternar tema"
                    />
                    <span className="toggle-track">
                      <span className="toggle-knob" />
                    </span>
                  </label>

                  <span className="toggle-text" aria-hidden>
                    {temaLocal ? "Escuro" : "Claro"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="geral-header">
              <h3>Segurança</h3>
            </div>

            <div className="form-grid">
              <div className="form-group full">
                <label>Nova senha</label>
                <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
              </div>

              <div className="form-group full">
                <label>Confirmar nova senha</label>
                <input type="password" value={confirmSenha} onChange={(e) => setConfirmSenha(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button className="btn-secondary">Cancelar</button>
        <button className="btn-primary">Salvar Alterações</button>
      </div>
    </div>
  );
}
