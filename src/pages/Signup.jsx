import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { IMaskInput } from "react-imask";
import { FiUser, FiUsers, FiArrowLeft, FiBookOpen } from "react-icons/fi";
import { LuBook } from "react-icons/lu";
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
  const [cpf, setCPF] = useState("");
  const [ra, setRA] = useState("");
  const [isCommunity, setIsCommunity] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) return "O email é obrigatório.";
    if (!nome.trim()) return "O nome é obrigatório.";
    if (!endereco.trim()) return "O endereço é obrigatório.";
    if (!isCommunity && !ra.trim()) return "O RA é obrigatório.";
    if (isCommunity && !cpf.trim()) return "O CPF é obrigatório.";
    if (!telefone.trim()) return "O telefone é obrigatório.";
    if (telefone.length < 11) return "O telefone deve conter 11 números.";
    if (!senha || senha.length < 6)
      return "A senha deve ter pelo menos 6 caracteres.";
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

    navigate("/login");
  };

  return (
    <div className="signup-wrapper">

      <div className="signup-header">
        <div className="icon-circle">
          <LuBook className="user-icon" />
        </div>
        <h1>Sistema de biblioteca</h1>
        <p>Escola 9 de Julho de Taquaritinga</p>
      </div>

      <div className="signup-card">

        <button className="back-link" onClick={() => navigate("/login")}>
          <FiArrowLeft />
          <span>Voltar ao Login</span>
        </button>

        <h2>Criar Nova Conta</h2>
        <p className="subtitle">Escolha o tipo de cadastro</p>

        <div className={`toggle ${isCommunity ? "community" : "student"}`}>
          <div className="slider"></div>

          <button
            type="button"
            className={!isCommunity ? "active" : ""}
            onClick={() => setIsCommunity(false)}
          >
            <FiUser />
            Aluno
          </button>

          <button
            type="button"
            className={isCommunity ? "active" : ""}
            onClick={() => setIsCommunity(true)}
          >
            <FiUsers />
            Comunidade
          </button>
        </div>

        <div className={`info-box ${isCommunity ? "community" : "student"}`}>
          {isCommunity ? (
            <>
              <strong>Cadastro para Comunidade</strong>
              <p>Para visitantes da Escola 9 de Julho</p>
            </>
          ) : (
            <>
              <strong>Cadastro para Alunos</strong>
              <p>Para alunos matriculados na Escola 9 de Julho de Taquaritinga</p>
            </>
          )}
        </div>

        <form onSubmit={handleSignup}>

          <div className="input-group">
            <label className="required">Nome Completo</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>

          {!isCommunity && (
            <div className="input-group">
              <label className="required">RA / Registro Escolar</label>
              <input value={ra} onChange={(e) => setRA(e.target.value)} required />
            </div>
          )}

          {isCommunity && (
            <div className="input-group">
              <label className="required">CPF</label>
              <IMaskInput
                mask="000.000.000-00"
                value={cpf}
                onAccept={(v) => setCPF(v.replace(/\D/g, ""))}
                required
              />
            </div>
          )}

          <div className="row">
            <div className="input-group">
              <label className="required">Telefone Principal</label>
              <IMaskInput
                mask="(00) 00000-0000"
                value={telefone}
                onAccept={(v) => setPhone(v.replace(/\D/g, ""))}
                required
              />
            </div>

            <div className="input-group">
              <label>Telefone Alternativo</label>
              <IMaskInput
                mask="(00) 00000-0000"
                value={telefoneR}
                onAccept={(v) => setPhoneR(v.replace(/\D/g, ""))}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="required">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="input-group">
            <label className="required">Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </div>

          {error && <div className="error">{error}</div>}

          <button className="submit-btn" disabled={loading}>
            {loading ? "Criando..." : "Criar Usuário"}
          </button>

        </form>
      </div>
    </div>
  );
}