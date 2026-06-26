import { useEffect, useState } from "react";
import { FiMail, FiEye, FiEyeOff } from "react-icons/fi";
import { useToast } from "../../../../../contexts/ToastContext";
import { getConfiguracoes, updateConfiguracao } from "../../../../../services/api";
import { getConfigValue } from "../../utils/configUtils";
import { useRegisterSave } from "../../contexts/ConfigSaveContext";
import "./Email.css";

export default function Email() {
  const { addToast } = useToast();
  const [smtp, setSmtp] = useState("");
  const [porta, setPorta] = useState(587);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const configs = await getConfiguracoes();
        setSmtp(getConfigValue(configs, "smtp_servidor", "smtp.escola.com"));
        setPorta(Number(getConfigValue(configs, "smtp_porta", "587")) || 587);
        setUsuario(getConfigValue(configs, "smtp_usuario", "biblioteca@escola.com"));
        setSenha(getConfigValue(configs, "smtp_senha", ""));
      } catch (error) {
        addToast("Erro ao carregar configurações de e-mail", "error");
      }
    }

    load();
  }, [addToast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateConfiguracao({ chave: "smtp_servidor", valor: smtp }),
        updateConfiguracao({ chave: "smtp_porta", valor: String(porta) }),
        updateConfiguracao({ chave: "smtp_usuario", valor: usuario }),
        updateConfiguracao({ chave: "smtp_senha", valor: senha }),
      ]);
      addToast("Configurações de e-mail salvas com sucesso", "success");
    } catch (error) {
      addToast("Erro ao salvar configurações de e-mail", "error");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  useRegisterSave("email", handleSave);

  return (
    <div className="card email-settings">
      <div className="email-header">
        <FiMail className="email-icon" />
        <h3>Configurações de E-mail</h3>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>Servidor SMTP</label>
          <input type="text" value={smtp} onChange={(e) => setSmtp(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Porta SMTP</label>
          <input
            type="number"
            value={porta}
            min={1}
            onChange={(e) => setPorta(Number(e.target.value) || 1)}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Usuário SMTP</label>
        <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
      </div>

      <div className="form-group password-group">
        <label>Senha SMTP</label>

        <div className="password-wrapper">
          <input
            type={mostrarSenha ? "text" : "password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <button
            type="button"
            className="toggle-password"
            onClick={() => setMostrarSenha(!mostrarSenha)}
          >
            {mostrarSenha ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
      </div>

      <div className="email-test-buttons">
        <button className="btn-outline" type="button">Testar Conexão</button>
        <button className="btn-outline" type="button">Enviar E-mail de Teste</button>
      </div>

      <div className="card-actions">
        <button
          className="btn-secondary"
          type="button"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>
    </div>
  );
}