import React, { useEffect, useState } from "react";
import { FiLock, FiUser, FiPhone, FiInfo, FiEye, FiEyeOff } from "react-icons/fi";
import Switch from "react-switch";
import { useToast } from "../../../contexts/ToastContext";
import { getMeuPerfil, atualizarMeuPerfil } from "../../../services/api";
import { applyTheme, getSavedTheme } from "../../../utils/theme";
import "../UserArea.css";
import "./Configuracoes.css";

export default function ConfiguracoesUser() {
  const { addToast } = useToast();

  // Perfil carregado da API
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  // Campos editáveis — contato
  const [telefone, setTelefone] = useState("");
  const [telefoneResp, setTelefoneResp] = useState("");
  const [endereco, setEndereco] = useState("");
  const [savingContato, setSavingContato] = useState(false);

  // Campos editáveis — senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);

  // Tema
  const [temaDark, setTemaDark] = useState(false);
  useEffect(() => {
    async function load() {
      try {
        const data = await getMeuPerfil();
        setPerfil(data);
        setTelefone(data.telefone || "");
        setTelefoneResp(data.telefoneResponsavel || "");
        setEndereco(data.endereco || "");
        setTemaDark(getSavedTheme().toLowerCase() === "escuro");
      } catch {
        addToast("Erro ao carregar perfil", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [addToast]);

  async function handleSalvarContato() {
    setSavingContato(true);
    try {
      await atualizarMeuPerfil({ telefone, telefoneResponsavel: telefoneResp, endereco });
      addToast("Informações de contato atualizadas", "success");
    } catch (e) {
      addToast(e?.message || "Erro ao salvar contato", "error");
    } finally {
      setSavingContato(false);
    }
  }

  async function handleSalvarSenha() {
    if (!senhaAtual) { addToast("Informe a senha atual", "error"); return; }
    if (!novaSenha)  { addToast("Informe a nova senha", "error"); return; }
    if (novaSenha !== confirmSenha) { addToast("As senhas não coincidem", "error"); return; }
    if (novaSenha.length < 6) { addToast("A nova senha deve ter ao menos 6 caracteres", "error"); return; }

    setSavingSenha(true);
    try {
      await atualizarMeuPerfil({ senhaAtual, novaSenha });
      addToast("Senha alterada com sucesso", "success");
      setSenhaAtual(""); setNovaSenha(""); setConfirmSenha("");
    } catch (e) {
      addToast(e?.message || "Erro ao alterar senha", "error");
    } finally {
      setSavingSenha(false);
    }
  }

  function handleToggleTema(checked) {
    const novoTema = checked ? "Escuro" : "Claro";
    setTemaDark(checked);
    applyTheme(novoTema);
    addToast(`Tema ${novoTema.toLowerCase()} aplicado`, "success");
  }

  const documento = perfil?.ra
    ? `RA: ${perfil.ra}`
    : perfil?.cpf
    ? `CPF: ${perfil.cpf}`
    : "—";

  if (loading) {
    return (
      <div className="user-page page-shell">
        <div className="user-config-loading">Carregando perfil...</div>
      </div>
    );
  }

  return (
    <div className="user-page page-shell user-config-page">
      <div className="top-bar">
        <div>
          <h1>Configurações</h1>
          <p>Gerencie suas informações de contato, aparência e segurança.</p>
        </div>
      </div>

      <div className="user-config-cards">
        {/* ── Coluna esquerda ── */}
        <div className="left-col">

          {/* Dados Pessoais — somente leitura */}
          <div className="card">
            <div className="geral-header">
              <FiUser className="card-section-icon" />
              <h3>Dados Pessoais</h3>
            </div>

            <div className="user-config-readonly-notice">
              <FiInfo className="notice-icon" />
              <span>Para atualizar esses dados, entre em contato com o bibliotecário responsável.</span>
            </div>

            <div className="form-grid three-col">
              <div className="form-group">
                <label>Nome</label>
                <input value={perfil?.nome || "—"} disabled aria-disabled="true" />
              </div>
              <div className="form-group">
                <label>Identificação</label>
                <input value={documento} disabled aria-disabled="true" />
              </div>
              <div className="form-group">
                <label>Data de Nascimento</label>
                <input
                  value={
                    perfil?.dataNascimento
                      ? new Date(perfil.dataNascimento + "T00:00:00").toLocaleDateString("pt-BR")
                      : "—"
                  }
                  disabled
                  aria-disabled="true"
                />
              </div>
              <div className="form-group full">
                <label>E-mail</label>
                <input value={perfil?.email || "—"} disabled aria-disabled="true" />
              </div>
            </div>
          </div>

          {/* Informações de contato — editável */}
          <div className="card">
            <div className="geral-header">
              <FiPhone className="card-section-icon" />
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
              {perfil?.tipo === "Aluno" && (
                <div className="form-group">
                  <label>Telefone do Responsável</label>
                  <input value={telefoneResp} onChange={(e) => setTelefoneResp(e.target.value)} />
                </div>
              )}
            </div>

            <div className="card-actions">
              <button
                className="btn-secondary"
                onClick={handleSalvarContato}
                disabled={savingContato}
              >
                {savingContato ? "Salvando..." : "Salvar Contato"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Coluna direita ── */}
        <div className="right-col">

          {/* Aparência */}
          <div className="card">
            <div className="geral-header">
              <h3>Aparência</h3>
            </div>
            <div className="form-grid">
              <div className="form-group switch-section full">
                <label className="section-label">Tema</label>
                <div className="control-row">
                  <Switch
                    checked={temaDark}
                    onChange={handleToggleTema}
                    offColor="#cbd5e1"
                    onColor="#111827"
                    uncheckedIcon={false}
                    checkedIcon={false}
                    height={26}
                    width={52}
                    handleDiameter={22}
                  />
                  <span className="toggle-text">{temaDark ? "Escuro" : "Claro"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Segurança */}
          <div className="card">
            <div className="geral-header">
              <FiLock className="card-section-icon" />
              <h3>Segurança</h3>
            </div>

            <div className="form-grid">
              <div className="form-group full password-group">
                <label>Senha atual</label>
                <div className="password-wrapper">
                  <input
                    type={showSenhaAtual ? "text" : "password"}
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                    aria-label="Mostrar senha"
                  >
                    {showSenhaAtual ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="form-group full password-group">
                <label>Nova senha</label>
                <div className="password-wrapper">
                  <input
                    type={showNovaSenha ? "text" : "password"}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowNovaSenha(!showNovaSenha)}
                    aria-label="Mostrar nova senha"
                  >
                    {showNovaSenha ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="form-group full">
                <label>Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmSenha}
                  onChange={(e) => setConfirmSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="card-actions">
              <button
                className="btn-secondary"
                onClick={handleSalvarSenha}
                disabled={savingSenha}
              >
                {savingSenha ? "Salvando..." : "Alterar Senha"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}