import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiBookOpen, FiChevronRight, FiSend, FiTrash2, FiX } from "react-icons/fi";
import { perguntarNovi } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import NoviMessage from "./NoviMessage";
import "./NoviChat.css";

const SUGESTOES = [
  "Como aprovar uma solicitação?",
  "Como cadastrar um livro?",
  "Como registrar uma devolução?",
  "Onde encontro os relatórios?",
];

const BOAS_VINDAS = {
  papel: "novi",
  texto: "Oi! Eu sou a Novi 👋 Posso te explicar os fluxos da Sala de Leitura e indicar a tela certa. Como posso ajudar?",
};

// Mensagens recentes enviadas como contexto (precisa acompanhar MAX_HISTORY do backend).
const MAX_HISTORICO = 10;
const MAX_TEXTO_HISTORICO = 1600;
const STORAGE_KEY = "novi-conversa-v1";

function caminhoSeguro(caminho) {
  return typeof caminho === "string" && /^\/admin(?:\/[a-z-]+)*$/.test(caminho);
}

function carregarConversa(email) {
  if (!email) return [BOAS_VINDAS];
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.email !== email || !Array.isArray(saved?.mensagens)) return [BOAS_VINDAS];
    const validas = saved.mensagens.slice(-MAX_HISTORICO).filter((item) =>
      ["gestor", "novi"].includes(item?.papel) && typeof item.texto === "string" &&
      item.texto.length > 0 && item.texto.length <= MAX_TEXTO_HISTORICO && !item.erro && item.contexto !== false
    ).map((item) => ({
      papel: item.papel,
      texto: item.texto,
      destino: caminhoSeguro(item.destino?.caminho) ? item.destino : null,
    }));
    return [BOAS_VINDAS, ...validas];
  } catch {
    return [BOAS_VINDAS];
  }
}

export default function NoviChat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const email = user?.email?.toLowerCase();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [mensagens, setMensagens] = useState(() => carregarConversa(email));
  const [enviando, setEnviando] = useState(false);
  const launcherRef = useRef(null);
  const inputRef = useRef(null);
  const fimRef = useRef(null);
  const pendingRef = useRef(null);

  useEffect(() => {
    if (aberto) inputRef.current?.focus();
  }, [aberto]);

  useEffect(() => {
    if (aberto) fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, aberto, enviando]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && aberto) {
        setAberto(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [aberto]);

  useEffect(() => () => pendingRef.current?.abort(), []);

  useEffect(() => {
    if (!email) return;
    try {
      const turnos = mensagens.filter((item) => item !== BOAS_VINDAS && !item.erro && item.contexto !== false)
        .slice(-MAX_HISTORICO);
      if (enviando && turnos.at(-1)?.papel === "gestor") turnos.pop();
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ email, mensagens: turnos }));
    } catch { /* Armazenamento indisponível: o chat segue funcionando em memória. */ }
  }, [email, mensagens, enviando]);

  async function enviar(pergunta = texto) {
    const mensagem = pergunta.trim();
    if (!mensagem || enviando) return;
    // Boas-vindas e avisos de erro não fazem parte da conversa: só trocas reais servem de contexto.
    const historico = mensagens.filter((item) => item !== BOAS_VINDAS && !item.erro && item.contexto !== false).slice(-MAX_HISTORICO)
      .map((item) => ({ papel: item.papel, texto: item.texto.slice(0, MAX_TEXTO_HISTORICO) }));
    setMensagens((atuais) => [...atuais, { papel: "gestor", texto: mensagem }]);
    setTexto("");
    setEnviando(true);
    const controller = new AbortController();
    pendingRef.current = controller;
    try {
      const resposta = await perguntarNovi(mensagem, historico, controller.signal);
      if (pendingRef.current !== controller) return;
      if (resposta.contexto === false) {
        setMensagens((atuais) => atuais.map((item, index) =>
          index === atuais.length - 1 && item.papel === "gestor" ? { ...item, contexto: false } : item));
      }
      setMensagens((atuais) => [...atuais, {
        papel: "novi",
        texto: resposta.resposta,
        contexto: resposta.contexto,
        destino: caminhoSeguro(resposta.destino?.caminho) ? resposta.destino : null,
      }]);
    } catch (error) {
      if (pendingRef.current === controller && error.name !== "AbortError") {
        setMensagens((atuais) => atuais.map((item, index) =>
          index === atuais.length - 1 && item.papel === "gestor" ? { ...item, erro: true } : item));
        setMensagens((atuais) => [...atuais, {
          papel: "novi",
          erro: true,
          texto: error.status === 429
            ? "Recebi muitas perguntas em pouco tempo. Aguarde alguns minutos e tente novamente."
            : error.status === 503
              ? (typeof error.data?.detail === "string" && error.data.detail.length <= 180
                ? error.data.detail
                : "Estou temporariamente indisponível para analisar sua pergunta. Tente novamente em instantes.")
              : "Não consegui responder agora. Tente novamente em instantes ou use o menu do sistema.",
        }]);
      }
    } finally {
      if (pendingRef.current === controller) {
        pendingRef.current = null;
        setEnviando(false);
      }
    }
  }

  function navegar(destino) {
    if (caminhoSeguro(destino?.caminho)) navigate(destino.caminho);
  }

  return createPortal(
    <div className="novi-root">
      {aberto && (
        <section className="novi-panel" role="dialog" aria-label="Conversa com Novi">
          <header className="novi-header">
            <button type="button" className="novi-close" aria-label="Fechar chat" onClick={() => {
              setAberto(false);
              launcherRef.current?.focus();
            }}><FiX /></button>
            <span className="novi-avatar" aria-hidden="true"><img src="/novi-logo.png" alt="" width="48" height="48" /></span>
            <span className="novi-heading"><strong>Novi</strong><small>Assistente da Sala de Leitura</small></span>
            {mensagens.length > 1 && <button type="button" className="novi-clear" onClick={() => {
              pendingRef.current?.abort();
              pendingRef.current = null;
              setEnviando(false);
              setMensagens([BOAS_VINDAS]);
              setTexto("");
              inputRef.current?.focus();
            }}><FiTrash2 aria-hidden="true" /> Limpar</button>}
          </header>
          <div className="novi-scroll" aria-live="polite" aria-relevant="additions text">
            {mensagens.length === 1 ? (
              <div className="novi-chat-welcome">
                <span className="novi-welcome-icon" aria-hidden="true"><FiBookOpen /></span>
                <h2>Oi! Eu sou a Novi 👋</h2>
                <p>Posso explicar os fluxos da Sala de Leitura e indicar a tela certa.</p>
                <div className="novi-suggestions" aria-label="Sugestões de perguntas">
                  {SUGESTOES.map((sugestao) => <button key={sugestao} type="button" onClick={() => enviar(sugestao)}>{sugestao}<FiChevronRight aria-hidden="true" /></button>)}
                </div>
              </div>
            ) : mensagens.map((item, index) => (
              <div key={index} className={`novi-message novi-message--${item.papel}`}>
                <div className="novi-bubble"><NoviMessage texto={item.texto} /></div>
                {item.destino && (
                  <button type="button" className="novi-destination" onClick={() => navegar(item.destino)}>
                    Abrir {item.destino.rotulo} <span aria-hidden="true">→</span>
                  </button>
                )}
              </div>
            ))}
            {enviando && <div className="novi-message novi-message--novi"><div className="novi-bubble" role="status">Novi está pensando…</div></div>}
            <div ref={fimRef} />
          </div>
          <form className="novi-composer" onSubmit={(event) => { event.preventDefault(); enviar(); }}>
            <label htmlFor="novi-input" className="novi-sr-only">Digite sua pergunta para a Novi</label>
            <textarea
              id="novi-input"
              ref={inputRef}
              rows={1}
              maxLength={800}
              placeholder="Escreva sua pergunta..."
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault(); enviar();
                }
              }}
            />
            <button type="submit" className="novi-send" aria-label="Enviar pergunta" disabled={!texto.trim() || enviando}><FiSend /></button>
          </form>
          <p className="novi-privacy">Respostas sobre a Sala de Leitura. Não envie senhas nem dados pessoais.</p>
        </section>
      )}
      <button
        type="button"
        ref={launcherRef}
        className={`novi-launcher${aberto ? "" : " novi-launcher--brand"}`}
        aria-label={aberto ? "Fechar Novi" : "Abrir chat da Novi"}
        aria-expanded={aberto}
        onClick={() => setAberto((value) => !value)}
      ><img src="/novi-logo.png" alt="" width="48" height="48" /><span className="novi-sr-only">Novi</span></button>
    </div>,
    document.body,
  );
}
