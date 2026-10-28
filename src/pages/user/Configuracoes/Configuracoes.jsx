import Skeleton from "../../../components/Skeleton/Skeleton";
import React, { useEffect, useState } from "react";
import {
  UserRound, IdCard, CalendarDays, Mail, Phone, MapPin, UsersRound,
  Palette, Sun, Moon, ShieldCheck, LockKeyhole, Info, Eye, EyeOff, Save
} from "lucide-react";
import { IMaskInput } from "react-imask";
import { useToast } from "../../../contexts/ToastContext";
import { getMeuPerfil, atualizarMeuPerfil } from "../../../services/api";
import { applyTheme } from "../../../utils/theme";
import { formatarCPF, MASK_TELEFONE } from "../../../utils/masks";
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
  const [showConfirmSenha, setShowConfirmSenha] = useState(false);
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
        setTemaDark(data.tema?.toLowerCase() === "escuro");
        applyTheme(data.tema || "Claro", { animate: false });
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
    if (novaSenha.length < 8) { addToast("A nova senha deve ter ao menos 8 caracteres", "error"); return; }

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

  async function handleToggleTema(checked) {
    const novoTema = checked ? "Escuro" : "Claro";
    const temaAnterior = temaDark;

    // Aplica visualmente na hora, sem esperar a resposta do servidor
    setTemaDark(checked);
    applyTheme(novoTema);

    try {
      await atualizarMeuPerfil({ tema: novoTema });
      addToast(`Tema ${novoTema.toLowerCase()} aplicado`, "success");
    } catch (e) {
      // Reverte se não conseguiu salvar no banco
      setTemaDark(temaAnterior);
      applyTheme(temaAnterior ? "Escuro" : "Claro");
      addToast(e?.message || "Erro ao salvar tema", "error");
    }
  }

  const documento = perfil?.ra
    ? `RA: ${perfil.ra}`
    : perfil?.cpf
    ? `CPF: ${formatarCPF(perfil.cpf)}`
    : "—";


  const nascimento = perfil?.dataNascimento
    ? new Date(perfil.dataNascimento + "T00:00:00").toLocaleDateString("pt-BR")
    : "—";

  if (loading) {
    return (
      <div className="user-page page-shell user-config-page">
        <Skeleton variant="profile" />
      </div>
    );
  }

  return (
    <div className="user-page page-shell user-config-page">
      <header className="top-bar">
        <div>
          <h1>Configurações</h1>
          <p>Gerencie suas informações de contato, aparência e segurança.</p>
        </div>
      </header>

      <div className="user-config-cards">
        <section className="user-config-card user-config-card--personal" aria-labelledby="user-config-personal-heading">
          <div className="user-config-card__heading">
            <span className="user-config-card__icon"><UserRound size={21} aria-hidden="true" /></span>
            <div>
              <h2 id="user-config-personal-heading">Dados pessoais</h2>
              <p>Suas informações principais, vinculadas ao cadastro.</p>
            </div>
          </div>
          <div className="user-config-readonly-notice" role="note">
            <Info size={15} aria-hidden="true" />
            <span>Para alterar esses dados, entre em contato com o bibliotecário responsável.</span>
          </div>
          <div className="user-config-fields user-config-fields--two">
            <div className="user-config-field">
              <label htmlFor="uc-nome">Nome completo</label>
              <span className="user-config-control">
                <UserRound size={16} aria-hidden="true" />
                <input id="uc-nome" value={perfil?.nome || "—"} disabled />
              </span>
            </div>
            <div className="user-config-field">
              <label htmlFor="uc-documento">RA / Identificação</label>
              <span className="user-config-control">
                <IdCard size={16} aria-hidden="true" />
                <input id="uc-documento" value={documento} disabled />
              </span>
            </div>
            <div className="user-config-field">
              <label htmlFor="uc-nascimento">Data de nascimento</label>
              <span className="user-config-control">
                <CalendarDays size={16} aria-hidden="true" />
                <input id="uc-nascimento" value={nascimento} disabled />
              </span>
            </div>
            <div className="user-config-field">
              <label htmlFor="uc-email">E-mail</label>
              <span className="user-config-control">
                <Mail size={16} aria-hidden="true" />
                <input id="uc-email" value={perfil?.email || "—"} disabled />
              </span>
            </div>
          </div>
        </section>

        <section className="user-config-card user-config-card--appearance" aria-labelledby="user-config-appearance-heading">
          <div className="user-config-card__heading">
            <span className="user-config-card__icon"><Palette size={21} aria-hidden="true" /></span>
            <div>
              <h2 id="user-config-appearance-heading">Aparência</h2>
              <p>Escolha o tema da interface conforme sua preferência.</p>
            </div>
          </div>
          <div className="user-config-themes" role="group" aria-label="Tema do sistema">
            <button
              type="button"
              className={"user-config-theme" + (!temaDark ? " is-selected" : "")}
              aria-pressed={!temaDark}
              onClick={() => { if (temaDark) handleToggleTema(false); }}
            >
              <Sun size={32} aria-hidden="true" />
              <strong>Claro</strong>
              <span>Interface clara e moderna</span>
            </button>
            <button
              type="button"
              className={"user-config-theme" + (temaDark ? " is-selected" : "")}
              aria-pressed={temaDark}
              onClick={() => { if (!temaDark) handleToggleTema(true); }}
            >
              <Moon size={32} aria-hidden="true" />
              <strong>Escuro</strong>
              <span>Interface escura para mais conforto visual</span>
            </button>
          </div>
        </section>

        <section className="user-config-card user-config-card--contact" aria-labelledby="user-config-contact-heading">
          <div className="user-config-card__heading">
            <span className="user-config-card__icon"><Phone size={21} aria-hidden="true" /></span>
            <div>
              <h2 id="user-config-contact-heading">Informações de contato</h2>
              <p>Mantenha seus dados atualizados para facilitar o contato da biblioteca.</p>
            </div>
          </div>
          <form className="user-config-form" onSubmit={e => { e.preventDefault(); handleSalvarContato(); }}>
            <div className="user-config-fields user-config-fields--two">
              <div className="user-config-field user-config-field--wide">
                <label htmlFor="uc-endereco">Endereço</label>
                <span className="user-config-control">
                  <MapPin size={16} aria-hidden="true" />
                  <input id="uc-endereco" value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, número e complemento" />
                </span>
              </div>
              <div className="user-config-field">
                <label htmlFor="uc-telefone">Telefone</label>
                <span className="user-config-control">
                  <Phone size={16} aria-hidden="true" />
                  <IMaskInput
                    id="uc-telefone"
                    mask={MASK_TELEFONE}
                    value={telefone}
                    onAccept={value => setTelefone(value.replace(/\D/g, ""))}
                    placeholder="(00) 00000-0000"
                  />
                </span>
              </div>
              {perfil?.tipo === "Aluno" && (
                <div className="user-config-field">
                  <label htmlFor="uc-responsavel">Telefone do responsável</label>
                  <span className="user-config-control">
                    <UsersRound size={16} aria-hidden="true" />
                    <IMaskInput
                      id="uc-responsavel"
                      mask={MASK_TELEFONE}
                      value={telefoneResp}
                      onAccept={value => setTelefoneResp(value.replace(/\D/g, ""))}
                      placeholder="(00) 00000-0000"
                    />
                  </span>
                </div>
              )}
            </div>
            <div className="user-config-actions">
              <button type="submit" className="user-config-primary" disabled={savingContato}>
                <Save size={16} aria-hidden="true" /> {savingContato ? "Salvando..." : "Salvar contato"}
              </button>
            </div>
          </form>
        </section>

        <section className="user-config-card user-config-card--security" aria-labelledby="user-config-security-heading">
          <div className="user-config-card__heading">
            <span className="user-config-card__icon"><ShieldCheck size={21} aria-hidden="true" /></span>
            <div>
              <h2 id="user-config-security-heading">Segurança</h2>
              <p>Altere sua senha para manter sua conta segura.</p>
            </div>
          </div>
          <form className="user-config-form" onSubmit={e => { e.preventDefault(); handleSalvarSenha(); }}>
            <div className="user-config-fields">
              <div className="user-config-field">
                <label htmlFor="uc-senha-atual">Senha atual</label>
                <span className="user-config-control">
                  <LockKeyhole size={16} aria-hidden="true" />
                  <input id="uc-senha-atual" type={showSenhaAtual ? "text" : "password"} value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} placeholder="Sua senha atual" autoComplete="current-password" />
                  <button type="button" className="user-config-eye" onClick={() => setShowSenhaAtual(!showSenhaAtual)} aria-label={showSenhaAtual ? "Ocultar senha atual" : "Mostrar senha atual"}>
                    {showSenhaAtual ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </div>
              <div className="user-config-field">
                <label htmlFor="uc-senha-nova">Nova senha</label>
                <span className="user-config-control">
                  <LockKeyhole size={16} aria-hidden="true" />
                  <input id="uc-senha-nova" type={showNovaSenha ? "text" : "password"} value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" minLength={8} />
                  <button type="button" className="user-config-eye" onClick={() => setShowNovaSenha(!showNovaSenha)} aria-label={showNovaSenha ? "Ocultar nova senha" : "Mostrar nova senha"}>
                    {showNovaSenha ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </div>
              <div className="user-config-field">
                <label htmlFor="uc-senha-confirmar">Confirmar nova senha</label>
                <span className="user-config-control">
                  <LockKeyhole size={16} aria-hidden="true" />
                  <input id="uc-senha-confirmar" type={showConfirmSenha ? "text" : "password"} value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} placeholder="Repita a nova senha" autoComplete="new-password" />
                  <button type="button" className="user-config-eye" onClick={() => setShowConfirmSenha(!showConfirmSenha)} aria-label={showConfirmSenha ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}>
                    {showConfirmSenha ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </div>
            </div>
            <div className="user-config-actions">
              <button type="submit" className="user-config-primary" disabled={savingSenha}>
                <LockKeyhole size={16} aria-hidden="true" /> {savingSenha ? "Salvando..." : "Alterar senha"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
