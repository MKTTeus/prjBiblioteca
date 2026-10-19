import { salvarConfiguracoes } from "./saveSettings";
import { updateConfiguracao } from "../../../../services/api";

jest.mock("../../../../services/api", () => ({ updateConfiguracao: jest.fn() }));

test("identifica a configuração que falhou e informa salvamentos parciais", async () => {
  updateConfiguracao.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("Serviço indisponível"));
  await expect(salvarConfiguracoes([
    ["Nome", "nome_biblioteca", "Sala de Leitura"],
    ["Prazo", "dias_emprestimo", 14],
  ])).rejects.toThrow(/1 de 2.*Prazo: Não foi possível salvar este valor/);
});
