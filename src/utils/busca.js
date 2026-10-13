/**
 * Busca tolerante a acentos, caixa, pontuação e pequenos erros de digitação.
 *
 * A regra de normalização é a mesma de src/backend/busca.py e da função SQL
 * public.busca_normalizar: ajustes aqui devem ser espelhados nos outros dois.
 *
 * 1. Busca exata: todas as palavras digitadas (em qualquer ordem) precisam aparecer
 *    no texto, ignorando acentos, maiúsculas e pontuação.
 * 2. Só quando a exata não encontra nada, aceita palavras com até um ou dois
 *    caracteres trocados, faltando ou invertidos. Números e códigos (RA, CPF,
 *    tombo) e palavras curtas nunca usam a busca aproximada.
 */

export function normalizarBusca(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function palavrasDaBusca(termo) {
  return normalizarBusca(termo).split(" ").filter(Boolean);
}

function limiteDeErros(tamanho) {
  if (tamanho < 4) return 0;
  return tamanho <= 8 ? 1 : 2;
}

// Distância de Damerau-Levenshtein limitada: devolve limite + 1 ao ultrapassar o máximo.
function distancia(a, b, limite) {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let anterior2 = null;
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const atual = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let valor = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo);
      if (anterior2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        valor = Math.min(valor, anterior2[j - 2] + 1);
      }
      atual[j] = valor;
    }
    if (Math.min(...atual) > limite) return limite + 1;
    anterior2 = anterior;
    anterior = atual;
  }
  return anterior[b.length];
}

function palavraSemelhante(palavraDigitada, palavra) {
  const limite = limiteDeErros(palavraDigitada.length);
  if (!limite || !/^\p{L}+$/u.test(palavraDigitada)) return false;
  // Compara com a palavra inteira e com o começo dela, para quem ainda está digitando.
  return (
    distancia(palavraDigitada, palavra, limite) <= limite ||
    distancia(palavraDigitada, palavra.slice(0, palavraDigitada.length), limite) <= limite
  );
}

const exata = (texto, partes) => partes.every((p) => texto.includes(p));

function aproximada(texto, partes) {
  const palavras = texto.split(" ");
  return partes.every((p) => texto.includes(p) || palavras.some((w) => palavraSemelhante(p, w)));
}

/** Verdadeiro se `texto` (string ou lista de campos) contém todas as palavras de `termo`. */
export function correspondeBusca(texto, termo, { aproximado = false } = {}) {
  const partes = palavrasDaBusca(termo);
  if (!partes.length) return true;
  const normalizado = normalizarBusca(Array.isArray(texto) ? texto.filter((t) => t != null).join(" ") : texto);
  return aproximado ? aproximada(normalizado, partes) : exata(normalizado, partes);
}

/**
 * Filtra `itens` pelo `termo`. `obterTextos(item)` devolve os campos pesquisáveis.
 * Faz a busca exata; só se ela não achar nada tenta a tolerante a erros de digitação.
 * Devolve `{ itens, aproximado }`.
 */
export function buscarEmLista(itens, termo, obterTextos) {
  const lista = Array.isArray(itens) ? itens : [];
  const partes = palavrasDaBusca(termo);
  if (!partes.length) return { itens: lista, aproximado: false };
  const preparados = lista.map((item) => ({
    item,
    texto: normalizarBusca(obterTextos(item).filter((t) => t != null).join(" ")),
  }));
  const exatos = preparados.filter(({ texto }) => exata(texto, partes)).map(({ item }) => item);
  if (exatos.length) return { itens: exatos, aproximado: false };
  const parecidos = preparados.filter(({ texto }) => aproximada(texto, partes)).map(({ item }) => item);
  return { itens: parecidos, aproximado: parecidos.length > 0 };
}

/** Atalho quando só a lista importa. */
export const filtrarPorBusca = (itens, termo, obterTextos) => buscarEmLista(itens, termo, obterTextos).itens;
