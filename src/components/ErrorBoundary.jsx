import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Loga no console pra facilitar diagnóstico; pode futuramente
    // enviar isso pra um serviço de monitoramento de erros.
    console.error("Erro não tratado na aplicação:", error, info);
  }

  handleReload = () => {
    window.location.href = "/#/login";
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "24px",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          <h2>Ops, algo deu errado.</h2>
          <p>Ocorreu um erro inesperado ao carregar esta tela.</p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: "#1a56db",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Voltar para o login
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}