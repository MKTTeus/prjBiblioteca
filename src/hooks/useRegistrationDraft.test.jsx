import { renderHook, act, waitFor } from "@testing-library/react";
import useRegistrationDraft, { readRegistrationDraft, registrationDraftKey } from "./useRegistrationDraft";

beforeEach(() => sessionStorage.clear());

test("recupera os campos apenas para a mesma conta e nunca armazena senha", async () => {
  const user = { email: "gestor@example.com" };
  const form = { nome: "Aluno novo", email: "aluno@example.com", senha: "senha-secreta" };
  const { result, rerender } = renderHook(({ dirty }) => useRegistrationDraft("alunos", user, {
    open: true, dirty, form, extra: null,
  }), { initialProps: { dirty: false } });
  rerender({ dirty: true });
  await waitFor(() => expect(readRegistrationDraft("alunos", user)?.form.nome).toBe("Aluno novo"));
  const raw = sessionStorage.getItem(registrationDraftKey("alunos", user));
  expect(raw).not.toContain("senha-secreta");
  expect(readRegistrationDraft("alunos", { email: "outra@example.com" })).toBeNull();
  act(() => result.current.clearDraft());
  expect(readRegistrationDraft("alunos", user)).toBeNull();
});
