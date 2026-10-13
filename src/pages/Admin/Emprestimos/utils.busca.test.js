import { filtrarEmprestimos, filtrarExemplares, filtrarUsuarios } from "./utils";

const usuarios = {
  1: { nome: "João Álvares", documento: "123.456.789-09", tipo: "Aluno" },
  2: { nome: "Maria Souza", documento: "98765", tipo: "Aluno" },
};
const exemplares = {
  10: { nome: "Memórias Póstumas de Brás Cubas", tombo: "T-001", isbn: "9788535911664" },
  11: { nome: "O Pequeno Príncipe", tombo: "T-002" },
};
const emprestimos = [
  { idEmprestimo: 1, idUsuario: 1, idExemplar: 10, movStatus: "Ativo" },
  { idEmprestimo: 2, idUsuario: 2, idExemplar: 11, movStatus: "Ativo" },
  { idEmprestimo: 3, idUsuario: 1, idExemplar: 11, movStatus: "Pendente" },
];

const ids = (lista) => lista.map((e) => e.idEmprestimo);

test("empréstimos: busca sem acento, por tombo sem hífen e por documento sem pontuação", () => {
  expect(ids(filtrarEmprestimos(emprestimos, "joao alvares", "todos", usuarios, exemplares))).toEqual([1]);
  expect(ids(filtrarEmprestimos(emprestimos, "memorias postumas", "todos", usuarios, exemplares))).toEqual([1]);
  expect(ids(filtrarEmprestimos(emprestimos, "t002", "todos", usuarios, exemplares))).toEqual([2]);
  expect(ids(filtrarEmprestimos(emprestimos, "12345678909", "todos", usuarios, exemplares))).toEqual([1]);
});

test("empréstimos: pendentes continuam fora da lista e busca vazia devolve os demais", () => {
  expect(ids(filtrarEmprestimos(emprestimos, "", "todos", usuarios, exemplares))).toEqual([1, 2]);
  expect(ids(filtrarEmprestimos(emprestimos, undefined, "todos", usuarios, exemplares))).toEqual([1, 2]);
});

test("empréstimos: tolera erro de digitação só quando não há resultado exato", () => {
  expect(ids(filtrarEmprestimos(emprestimos, "pricipe", "todos", usuarios, exemplares))).toEqual([2]);
  expect(filtrarEmprestimos(emprestimos, "xadrez", "todos", usuarios, exemplares)).toEqual([]);
});

test("usuários e exemplares usam a mesma busca", () => {
  const lista = Object.values(usuarios);
  expect(filtrarUsuarios(lista, "joao")).toEqual([usuarios[1]]);
  expect(filtrarUsuarios(lista, "")).toEqual(lista);
  const exs = Object.values(exemplares);
  expect(filtrarExemplares(exs, "principe")).toEqual([exemplares[11]]);
  expect(filtrarExemplares(exs, "t 001")).toEqual([exemplares[10]]);
});
