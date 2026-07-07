export function getErrorMessage(err, fallback = "Ocorreu um erro. Tente novamente.") {
  const detail = err?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  // Erros de validação do FastAPI/Pydantic (422) vêm como uma lista de
  // objetos {loc, msg, type} em vez de uma string simples.
  if (Array.isArray(detail) && detail.length > 0) {
    const primeiro = detail[0];
    if (primeiro?.msg) {
      const campo = Array.isArray(primeiro.loc) ? primeiro.loc[primeiro.loc.length - 1] : null;
      return campo ? `${campo}: ${primeiro.msg}` : primeiro.msg;
    }
  }

  return fallback;
}