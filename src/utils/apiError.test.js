import { getErrorMessage } from "./apiError";

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
});
