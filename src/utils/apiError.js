const FIELD_LABELS = {
  email: "E-mail",
  senha: "Senha",
  novaSenha: "Nova senha",
  senhaAtual: "Senha atual",
  nome: "Nome",
  ra: "RA",
  cpf: "CPF",
  telefone: "Telefone",
  telefoneResponsavel: "Telefone do responsável",
  endereco: "Endereço",
  file: "Arquivo",
  serie: "Série",
  turma: "Turma",
  status: "Status",
  professor: "Perfil do administrador",
  idLivro: "Livro",
  idUsuario: "Usuário",
  idAdmin: "Administrador",
  quantidade: "Quantidade",
  novaData: "Nova data",
};

const DETAIL_MESSAGES = {
  USUARIO_INATIVO:
    "Já existe um cadastro com estes dados, mas ele está inativo. Reative o cadastro existente ou use outro e-mail e identificador.",
  "Email já cadastrado como administrador":
    "Este e-mail já está associado a uma conta de administrador. Informe outro e-mail.",
  "Email já cadastrado como usuário":
    "Este e-mail já está associado a uma conta de usuário. Informe outro e-mail.",
  "Admin já existe":
    "Já existe uma conta de administrador com este e-mail. Confira o endereço ou informe outro.",
  "Email já cadastrado":
    "Este e-mail já pertence a outro cadastro. Confira o endereço ou use outro e-mail.",
  "Email já cadastrado para outro usuário":
    "Este e-mail já pertence a outro cadastro. Confira o endereço ou use outro e-mail.",
  "RA já cadastrado":
    "Este RA já pertence a outro cadastro. Confira o número ou use outro RA.",
  "RA já cadastrado para outro usuário":
    "Este RA já pertence a outro cadastro. Confira o número ou use outro RA.",
  "CPF já cadastrado":
    "Este CPF já pertence a outro cadastro. Confira o número ou use outro CPF.",
  "CPF já cadastrado para outro usuário":
    "Este CPF já pertence a outro cadastro. Confira o número ou use outro CPF.",
  "Já existe um cadastro com esses dados":
    "Já existe um cadastro com um destes dados (e-mail, RA ou CPF). Confira as informações e tente novamente.",
  "Falha ao criar aluno":
    "Não foi possível concluir o cadastro do aluno. Tente novamente; se o problema continuar, informe a tela e o horário à equipe.",
  "Falha ao criar membro":
    "Não foi possível concluir o cadastro deste membro. Tente novamente; se o problema continuar, informe a tela e o horário à equipe.",
  "Falha ao atualizar aluno":
    "Não foi possível salvar as alterações do aluno. Confira a lista antes de repetir e, se o problema continuar, informe a tela e o horário à equipe.",
  "Falha ao atualizar membro":
    "Não foi possível salvar as alterações deste membro. Confira a lista antes de repetir e, se o problema continuar, informe a tela e o horário à equipe.",
  "Falha ao reativar usuário no banco de dados":
    "Não foi possível confirmar a reativação deste cadastro. Confira a lista antes de repetir e, se o problema continuar, informe a tela e o horário à equipe.",
};

function labelForLocation(loc) {
  if (!Array.isArray(loc)) return null;
  for (let i = loc.length - 1; i >= 0; i -= 1) {
    if (["body", "query", "path"].includes(loc[i])) continue;
    if (FIELD_LABELS[loc[i]]) return FIELD_LABELS[loc[i]];
  }
  return null;
}

function translateValidation(issue) {
  const type = String(issue?.type || "").toLowerCase();
  const raw = String(issue?.msg || "");
  const lower = raw.toLowerCase();
  const min = issue?.ctx?.min_length ?? raw.match(/at least (\d+) characters?/i)?.[1];
  const max = issue?.ctx?.max_length ?? raw.match(/at most (\d+) characters?/i)?.[1];

  if (type === "missing" || raw === "Field required") return "é obrigatório.";
  if (type.includes("too_short") || /at least \d+ characters?/i.test(raw)) {
    return min ? `use pelo menos ${min} caracteres.` : "está muito curto.";
  }
  if (type.includes("too_long") || /at most \d+ characters?/i.test(raw)) {
    return max ? `use no máximo ${max} caracteres.` : "está muito longo.";
  }
  if (type.includes("email") || lower.includes("valid email address")) {
    return "informe um endereço de e-mail válido.";
  }
  if (type.includes("int") || lower.includes("valid integer")) {
    return "informe um número inteiro.";
  }
  if (type.includes("bool") || lower.includes("valid boolean")) {
    return "selecione uma opção válida.";
  }
  if (type.includes("pattern") || lower.includes("match pattern")) {
    return "use o formato indicado.";
  }
  if (type.includes("string_type") || lower.includes("valid string")) {
    return "informe um texto válido.";
  }
  if (issue?.loc?.includes("file")) {
    return "selecione um arquivo válido.";
  }
  return "verifique o valor informado.";
}

function getValidationMessage(detail) {
  const mensagens = detail.slice(0, 3).map((issue) => {
    const campo = labelForLocation(issue?.loc);
    const mensagem = translateValidation(issue);
    return campo ? `${campo}: ${mensagem}` : mensagem;
  });
  const extras = detail.length > 3 ? " Revise também os outros campos." : "";
  return `${mensagens.join(" ")}${extras}`.trim() || "Revise os dados informados e tente novamente.";
}

function appendRequestId(message, requestId) {
  return requestId ? `${message} Código para atendimento: ${requestId}.` : message;
}

export function isInactiveUserError(err) {
  const detail = err?.data?.detail;
  if (detail === "USUARIO_INATIVO") return true;
  return typeof err?.message === "string" && err.message.includes("USUARIO_INATIVO");
}

export function getErrorMessage(err, fallback = "Ocorreu um erro. Tente novamente.") {
  const detail = err?.data?.detail;
  const requestId = err?.requestId || err?.data?.request_id;

  if (err?.status === 0 && err?.message) return err.message;

  if (typeof detail === "string" && detail.trim()) {
    const cleanDetail = detail.trim();
    if (DETAIL_MESSAGES[cleanDetail]) {
      return appendRequestId(DETAIL_MESSAGES[cleanDetail], err?.status >= 500 ? requestId : null);
    }
    if (cleanDetail === "Serviço temporariamente indisponível" && err?.status === 503) {
      return appendRequestId(
        "A Sala de Leitura está temporariamente sem acesso a um serviço necessário. Tente novamente em alguns instantes.",
        requestId,
      );
    }
    if (cleanDetail === "Serviço temporariamente indisponível" ||
        cleanDetail === "Não foi possível concluir a operação" ||
        cleanDetail === "Erro interno do servidor" || err?.status >= 500) {
      return appendRequestId(
        "O servidor não conseguiu concluir esta ação. Confira se a alteração apareceu antes de repetir. Se o problema continuar, informe a tela e o horário à equipe.",
        requestId,
      );
    }
    // Não mostre códigos internos de API como USUARIO_INATIVO para quem usa a tela.
    if (/^[A-Z][A-Z0-9_]+$/.test(cleanDetail)) return fallback;
    return cleanDetail;
  }

  // FastAPI/Pydantic envia erros 422 como uma lista de {loc, msg, type}.
  if (Array.isArray(detail) && detail.length > 0) {
    return getValidationMessage(detail);
  }

  const porStatus = {
    0: "Não foi possível conectar à Sala de Leitura. Verifique sua conexão com a internet e tente novamente.",
    408: "A solicitação demorou demais e foi interrompida. Verifique se a operação foi concluída antes de repeti-la.",
    413: "O arquivo enviado ultrapassa o tamanho permitido. Escolha um arquivo menor e tente novamente.",
    429: "Muitas tentativas foram feitas em pouco tempo. Aguarde alguns minutos e tente novamente.",
    500: "O servidor não conseguiu concluir esta ação. Confira se a alteração apareceu antes de repetir. Se o problema continuar, informe a tela e o horário à equipe.",
    502: "Um serviço necessário não respondeu corretamente. Tente novamente em alguns instantes.",
    503: "A Sala de Leitura está temporariamente sem acesso a um serviço necessário. Tente novamente em alguns instantes.",
    504: "A resposta do servidor demorou além do limite. Verifique se a operação foi concluída antes de repeti-la.",
  };
  return appendRequestId(porStatus[err?.status] || fallback, requestId);
}
