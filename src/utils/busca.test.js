import casos from "./buscaCasos.json";
import { buscarEmLista, correspondeBusca, filtrarPorBusca, normalizarBusca } from "./busca";

test.each(casos.normalizar)("normaliza %j como %j (mesma regra do SQL e do Python)", (entrada, saida) => {
  expect(normalizarBusca(entrada)).toBe(saida);
});

test.each(casos.exata)("busca exata: %j com %j => %s", (texto, termo, esperado) => {
  expect(correspondeBusca(texto, termo)).toBe(esperado);
});

test.each(casos.aproximada)("busca aproximada: %j com %j => %s", (texto, termo, esperado) => {
  expect(correspondeBusca(texto, termo, { aproximado: true })).toBe(esperado);
});

test("termo vazio ou nulo devolve tudo sem marcar aproximado", () => {
  expect(buscarEmLista(["a", "b"], "   ", (t) => [t])).toEqual({ itens: ["a", "b"], aproximado: false });
  expect(buscarEmLista(["a"], null, (t) => [t]).itens).toEqual(["a"]);
  expect(buscarEmLista(null, "x", (t) => [t])).toEqual({ itens: [], aproximado: false });
});

test("palavras em qualquer ordem e entre campos diferentes", () => {
  const alunos = [
    { nome: "Maria Souza", turma: "7A" },
    { nome: "Mario Souza", turma: "8B" },
  ];
  expect(filtrarPorBusca(alunos, "souza 7a", (a) => [a.nome, a.turma])).toEqual([alunos[0]]);
});

test("erro de digitação só entra quando não há resultado exato", () => {
  const nomes = ["Maria Silva", "Mario Silva"];
  expect(buscarEmLista(nomes, "maria", (n) => [n])).toEqual({ itens: ["Maria Silva"], aproximado: false });
  expect(buscarEmLista(nomes, "marja", (n) => [n]).aproximado).toBe(true);
});

test("campos ausentes são ignorados", () => {
  const itens = [{ nome: "José", email: null }];
  expect(filtrarPorBusca(itens, "jose", (i) => [i.nome, i.email, undefined])).toEqual(itens);
});
