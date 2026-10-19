export function getErrorMessage(err, fallback = "Ocorreu um erro. Tente novamente.") {
  const detail = err?.data?.detail;
  const requestId = err?.requestId || err?.data?.request_id;

  if (err?.status === 0 && err?.message) return err.message;

  if (typeof detail === "string" && detail.trim()) {
    // Os endpoints mais antigos ainda devolvem estes textos genéricos. Troca
    // por uma orientação clara sem expor mensagens internas do servidor.
    const generic = ["Serviço temporariamente indisponível", "Não foi possível concluir a operação", "Erro interno do servidor"];
    if (!generic.includes(detail.trim())) {
      return err?.status >= 500 && requestId ? `${detail} Código para atendimento: ${requestId}.` : detail;
    }
  }

  // Erros de validação do FastAPI/Pydantic (422) vêm como uma lista de
  // objetos {loc, msg, type} em vez de uma string simples.
  if (Array.isArray(detail) && detail.length > 0) {
    const primeiro = detail[0];
    if (primeiro?.msg) {
      const campo = Array.isArray(primeiro.loc) ? primeiro.loc[primeiro.loc.length - 1] : null;
      const nomes = {
        body: "Dados enviados", query: "Filtro", path: "Endereço da solicitação",
        email: "E-mail", senha: "Senha", nome: "Nome", ra: "RA", serie: "Série",
        turma: "Turma", idLivro: "Livro", quantidade: "Quantidade", novaData: "Nova data",
      };
      const campoNome = campo ? (nomes[campo] || campo) : null;
      const mensagem = String(primeiro.msg).replace(/^Field required$/, "é obrigatório").replace(/^Input should be a valid integer$/, "deve ser um número inteiro");
      return campoNome ? `${campoNome}: ${mensagem}` : mensagem;
    }
  }

  const porStatus = {
    0: "Não foi possível conectar à Sala de Leitura. Verifique sua conexão com a internet e tente novamente.",
    408: "A solicitação demorou demais e foi interrompida. Verifique se a operação foi concluída antes de repeti-la.",
    413: "O arquivo enviado ultrapassa o tamanho permitido. Escolha um arquivo menor e tente novamente.",
    429: "Muitas tentativas foram feitas em pouco tempo. Aguarde alguns minutos e tente novamente.",
    500: "O servidor encontrou uma falha ao processar esta ação. Tente novamente; se continuar, informe a tela e o horário à equipe.",
    502: "Um serviço necessário não respondeu corretamente. Tente novamente em alguns instantes.",
    503: "A Sala de Leitura está temporariamente sem acesso a um serviço necessário. Tente novamente em alguns instantes.",
    504: "A resposta do servidor demorou além do limite. Verifique se a operação foi concluída antes de repeti-la.",
  };
  const mensagem = porStatus[err?.status] || fallback;
  return requestId ? `${mensagem} Código para atendimento: ${requestId}.` : mensagem;
}
