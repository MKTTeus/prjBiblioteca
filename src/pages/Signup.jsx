import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { IMaskInput } from "react-imask";
import "../styles/Signup.css";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [telefone, setPhone] = useState("");
  const [telefoneR, setPhoneR] = useState("");
  const [endereco, setEndereco] = useState("");
  const [ra, setRA] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) return "O email é obrigatório.";
    if (!nome.trim()) return "O nome é obrigatório.";
    if (!endereco.trim()) return "O endereço é obrigatório.";
    if (!ra.trim()) return "O RA é obrigatório.";
    if (!telefone.trim()) return "O telefone é obrigatório.";
    if (telefone.length < 11) return "O telefone deve conter 11 números.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Digite um email válido.";
    if (!senha) return "A senha é obrigatória.";
    if (senha.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
    return "";
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    const result = await signup({
      nome,
      email,
      senha,
      telefone,
      telefoneResponsavel: telefoneR || null,
      endereco,
      ra,
    });

    if (!result.ok) {
      setError(result.message);
      setLoading(false);
      return;
    }

    alert(result.message);
    navigate("/login");
    setLoading(false);
  };

  return (
    <div className="signup-container">
      <h2>Criar Conta</h2>

      <form className="signup-form" onSubmit={handleSignup}>
        <label>Nome</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Digite seu nome"
          required
        />

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Digite seu email"
          required
        />

        <label>Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Digite sua senha"
          required
        />

        <label>Telefone</label>
        <IMaskInput
          mask="(00) 00000-0000"
          value={telefone}
          onAccept={(value) => setPhone(value.replace(/\D/g, ""))}
          placeholder="(11) 98765-4321"
          required
          type="tel"
        />

        <label>Telefone Responsável (opcional)</label>
        <IMaskInput
          mask="(00) 00000-0000"
          value={telefoneR}
          onAccept={(value) => setPhoneR(value.replace(/\D/g, ""))}
          placeholder="(11) 91234-5678"
          type="tel"
        />

        <label>Endereço</label>
        <input
          type="text"
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          placeholder="Digite seu endereço"
          required
        />

        <label>RA</label>
        <input
          type="text"
          value={ra}
          onChange={(e) => setRA(e.target.value)}
          placeholder="Digite seu RA"
          required
        />

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Criando..." : "Registrar"}
        </button>
      </form>

      <button
        className="login-redirect-btn"
        onClick={() => navigate("/login")}
        style={{
          marginTop: "1rem",
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #007bff",
          background: "white",
          color: "#007bff",
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        Já possui conta? Faça login
      </button>
    </div>
  );
}
