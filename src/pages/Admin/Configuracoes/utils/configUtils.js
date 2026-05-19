export const getConfigValue = (configs, chave, defaultValue = "") => {
  if (!Array.isArray(configs)) {
    return defaultValue;
  }
  const item = configs.find((config) => config.chave === chave);
  if (!item || item.valor === undefined || item.valor === null) {
    return defaultValue;
  }
  return String(item.valor);
};

export const configToBool = (configs, chave, defaultValue = false) => {
  const raw = getConfigValue(configs, chave, defaultValue);
  if (typeof raw === "boolean") {
    return raw;
  }
  const normalized = String(raw).toLowerCase();
  return ["true", "1", "yes", "on"].includes(normalized);
};

export const configToNumber = (configs, chave, defaultValue = 0) => {
  const raw = getConfigValue(configs, chave, defaultValue);
  const number = parseInt(String(raw), 10);
  return Number.isNaN(number) ? defaultValue : number;
};
