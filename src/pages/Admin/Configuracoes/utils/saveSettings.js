import { updateConfiguracao } from "../../../../services/api";
import { getErrorMessage } from "../../../../utils/apiError";

export async function salvarConfiguracoes(campos) {
  const results = await Promise.allSettled(campos.map(([, chave, valor]) =>
    updateConfiguracao({ chave, valor: String(valor) })
  ));
  const errors = results.flatMap((result, index) => result.status === "rejected"
    ? [`${campos[index][0]}: ${getErrorMessage(result.reason, "Não foi possível salvar este valor")}`] : []);
  if (errors.length) {
    const saved = results.length - errors.length;
    throw new Error(`${saved} de ${results.length} configuração(ões) salvas. Falha em: ${errors.join("; ")}. Confira os valores antes de repetir.`);
  }
}
