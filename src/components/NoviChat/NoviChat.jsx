import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiBookOpen, FiMessageCircle, FiSend, FiX } from "react-icons/fi";
import { perguntarNovi } from "../../services/api";
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

function caminhoSeguro(caminho) {
  return typeof caminho === "string" && /^\/admin(?:\/[a-z-]+)*$/.test(caminho);
}

export default function NoviChat() {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [mensagens, setMensagens] = useState([BOAS_VINDAS]);
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

  async function enviar(pergunta = texto) {
    const mensagem = pergunta.trim();
    if (!mensagem || enviando) return;
    const historico = mensagens.filter((item) => item !== BOAS_VINDAS).slice(-6)
      .map((item) => ({ papel: item.papel, texto: item.texto.slice(0, 800) }));
    setMensagens((atuais) => [...atuais, { papel: "gestor", texto: mensagem }]);
    setTexto("");
    setEnviando(true);
    const controller = new AbortController();
    pendingRef.current = controller;
    try {
      const resposta = await perguntarNovi(mensagem, historico, controller.signal);
      if (pendingRef.current !== controller) return;
      setMensagens((atuais) => [...atuais, {
        papel: "novi",
        texto: resposta.resposta,
        destino: caminhoSeguro(resposta.destino?.caminho) ? resposta.destino : null,
      }]);
    } catch (error) {
      if (pendingRef.current === controller && error.name !== "AbortError") {
        setMensagens((atuais) => [...atuais, {
          papel: "novi",
          texto: error.status === 429
            ? "Recebi muitas perguntas em pouco tempo. Aguarde alguns minutos e tente novamente."
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
            <span className="novi-avatar" aria-hidden="true"><FiBookOpen /></span>
            <span className="novi-heading"><strong>Novi</strong><small>Assistente da Sala de Leitura</small></span>
            {mensagens.length > 1 && <button type="button" className="novi-clear" onClick={() => {
              pendingRef.current?.abort();
              pendingRef.current = null;
              setEnviando(false);
              setMensagens([BOAS_VINDAS]);
              setTexto("");
              inputRef.current?.focus();
            }}>Limpar</button>}
            <button type="button" className="novi-close" aria-label="Fechar chat" onClick={() => {
              setAberto(false);
              launcherRef.current?.focus();
            }}><FiX /></button>
          </header>
          <div className="novi-intro">Vamos encontrar o caminho certo juntos.</div>
          <div className="novi-scroll" aria-live="polite" aria-relevant="additions text">
            {mensagens.map((item, index) => (
              <div key={index} className={`novi-message novi-message--${item.papel}`}>
                <div className="novi-bubble">{item.texto}</div>
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
          {mensagens.length === 1 && (
            <div className="novi-suggestions" aria-label="Sugestões de perguntas">
              {SUGESTOES.map((sugestao) => <button key={sugestao} type="button" onClick={() => enviar(sugestao)}>{sugestao}</button>)}
            </div>
          )}
          <form className="novi-composer" onSubmit={(event) => { event.preventDefault(); enviar(); }}>
            <label htmlFor="novi-input" className="novi-sr-only">Digite sua pergunta para a Novi</label>
            <textarea
              id="novi-input"
              ref={inputRef}
              rows={1}
              maxLength={800}
              placeholder="Digite sua pergunta..."
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
          <p className="novi-privacy">Não envie senhas nem dados pessoais. A Novi não executa ações.</p>
        </section>
      )}
      <button
        type="button"
        ref={launcherRef}
        className="novi-launcher"
        aria-label={aberto ? "Fechar Novi" : "Abrir chat da Novi"}
        aria-expanded={aberto}
        onClick={() => setAberto((value) => !value)}
      >{aberto ? <FiX /> : <FiMessageCircle />}<span className="novi-sr-only">Novi</span></button>
    </div>,
    document.body,
  );
}
