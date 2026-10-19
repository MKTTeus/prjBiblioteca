import { getErrorMessage, isInactiveUserError } from "./apiError";

describe("getErrorMessage", () => {
  it("explica falhas de conexão", () => {
    expect(getErrorMessage({ status: 0, message: "Não foi possível conectar à Sala de Leitura." }))
      .toContain("conectar");
  });

  it("substitui mensagens genéricas do servidor e inclui o código de atendimento", () => {
    expect(getErrorMessage({
      status: 503,
      data: { detail: "Serviço temporariamente indisponível" },
      requestId: "req-123",
    })).toBe("A Sala de Leitura está temporariamente sem acesso a um serviço necessário. Tente novamente em alguns instantes. Código para atendimento: req-123.");
  });

  it("preserva a explicação específica devolvida pela operação", () => {
    expect(getErrorMessage({ data: { detail: "Não foi possível registrar a devolução." } }))
      .toBe("Não foi possível registrar a devolução.");
  });

  it("traduz validações do servidor para português e identifica o campo", () => {
    expect(getErrorMessage({
      status: 422,
      data: {
        detail: [{
          loc: ["body", "senha"],
          msg: "String should have at least 8 characters",
          type: "string_too_short",
          ctx: { min_length: 8 },
        }],
      },
    })).toBe("Senha: use pelo menos 8 caracteres.");
  });

  it("explica e reconhece cadastro inativo sem expor o código interno", () => {
    const err = { status: 409, data: { detail: "USUARIO_INATIVO" } };
    expect(isInactiveUserError(err)).toBe(true);
    expect(getErrorMessage(err)).toContain("cadastro");
    expect(getErrorMessage(err)).not.toContain("USUARIO_INATIVO");
  });

  it("não mostra nomes internos de campos em validações desconhecidas", () => {
    expect(getErrorMessage({
      status: 422,
      data: { detail: [{ loc: ["body", "usuTokenVersion"], msg: "Input should be valid", type: "value_error" }] },
    })).toBe("verifique o valor informado.");
  });

  it("substitui detalhes técnicos de falhas internas e inclui o código de atendimento", () => {
    expect(getErrorMessage({
      status: 500,
      data: { detail: "Falha ao criar aluno" },
      requestId: "req-456",
    })).toContain("Código para atendimento: req-456.");
    expect(getErrorMessage({
      status: 500,
      data: { detail: "Falha ao criar aluno" },
      requestId: "req-456",
    })).not.toContain("Falha ao criar aluno");
  });
});
