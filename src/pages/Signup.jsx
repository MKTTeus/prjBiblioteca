import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { IMaskInput } from "react-imask";
import "../styles/Signup.css";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  // Dados do formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [telefone, setPhone] = useState("");
  const [telefoneR, setPhoneR] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cpf, setCPF] = useState("");
  const [ra, setRA] = useState("");

  // Controle de estado geral
  const [isCommunity, setIsCommunity] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Validação dinâmica
  const validate = () => {
    if (!email.trim()) return "O email é obrigatório.";
    if (!nome.trim()) return "O nome é obrigatório.";
    if (!endereco.trim()) return "O endereço é obrigatório.";

    // Validação dinâmica RA/CPF
    if (!isCommunity && !ra.trim()) return "O RA é obrigatório.";
    if (isCommunity && !cpf.trim()) return "O CPF é obrigatório.";

    if (!telefone.trim()) return "O telefone é obrigatório.";
    if (telefone.length < 11) return "O telefone deve conter 11 números.";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Digite um email válido.";

    if (!senha) return "A senha é obrigatória.";
    if (senha.length < 6) return "A senha deve ter pelo menos 6 caracteres.";

    return "";
  };

  // Envio do formulário
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

    const payload = {
      nome,
      email,
      senha,
      telefone,
      telefoneResponsavel: telefoneR || null,
      endereco,
      ra: isCommunity ? null : ra,
      cpf: isCommunity ? cpf : null,
      tipo: isCommunity ? "Comunidade" : "Aluno",
    };
    const result = await signup(payload);

    if (!result.ok) {
      setError(result.message);
      setLoading(false);
      return;
    }

    alert(result.message);
    navigate("/login");
    setLoading(false);
  };

  // Alternar modo aluno/comunidade
  const toggleType = () => {
    setIsCommunity(!isCommunity);
    setCPF("");
    setRA("");
    setError("");
  };

  return (
    <div className="signup-container">
      <h2>Criar Conta</h2>

      {/* BOTÃO DE ALTERAÇÃO */}
      <button
        type="button"
        className="toggle-type-btn"
        onClick={toggleType}
        style={{
          marginBottom: "1rem",
          padding: "10px",
          borderRadius: "8px",
          background: isCommunity ? "#007bff" : "#28a745",
          color: "white",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {isCommunity ? "Registrar como ALUNO" : "Registrar como COMUNIDADE"}
      </button>

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

        {/* ⬇ DINÂMICO: RA ou CPF */}
        {!isCommunity ? (
          <>
            <label>RA</label>
            <input
              type="text"
              value={ra}
              onChange={(e) => setRA(e.target.value)}
              placeholder="Digite seu RA"
              required
            />
          </>
        ) : (
          <>
            <label>CPF</label>
            <IMaskInput
              mask="000.000.000-00"
              value={cpf}
              onAccept={(value) => setCPF(value.replace(/\D/g, ""))}
              placeholder="123.456.789-10"
              required
              type="text"
            />
          </>
        )}

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
        }}
      >
        Já possui conta? Faça login
      </button>
    </div>
  );
}
