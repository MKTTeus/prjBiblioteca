// Utilitários de máscara/formatação para exibição e inputs.
// Os dados são armazenados sem formatação (apenas dígitos); estas funções
// apenas formatam para exibição. Para inputs use os MASK_* com IMaskInput.

export function somenteDigitos(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

// CPF: 000.000.000-00 (formata progressivamente conforme digita)
export function formatarCPF(valor) {
  const d = somenteDigitos(valor).slice(0, 11);
  if (!d) return "";
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// Telefone: (00) 00000-0000 (celular) ou (00) 0000-0000 (fixo)
export function formatarTelefone(valor) {
  const d = somenteDigitos(valor).slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Data para exibição em pt-BR (dd/mm/aaaa). Aceita ISO, Date ou já formatada.
export function formatarData(valor) {
  if (!valor) return "-";

  if (typeof valor === "string") {
    // Já vem como dd/mm/aaaa
    if (/^\d{2}\/\d{2}\/\d{4}/.test(valor)) return valor.slice(0, 10);
    // ISO apenas data (sem hora): evita deslocamento de fuso
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return new Date(valor + "T00:00:00").toLocaleDateString("pt-BR");
    }
  }

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleDateString("pt-BR");
}

// Valida um CPF conferindo os dígitos verificadores.
// Aceita CPF formatado ou só dígitos. Retorna true se for válido.
export function validarCPF(valor) {
  const cpf = somenteDigitos(valor);

  // Deve ter 11 dígitos e não pode ser uma sequência repetida (ex.: 111.111.111-11)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (qtd) => {
    let soma = 0;
    for (let i = 0; i < qtd; i++) {
      soma += Number(cpf[i]) * (qtd + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(9) === Number(cpf[9]) && calcularDigito(10) === Number(cpf[10]);
}

// Máscaras para uso com IMaskInput (react-imask)
export const MASK_CPF = "000.000.000-00";
export const MASK_TELEFONE = "(00) 0000[0]-0000";
