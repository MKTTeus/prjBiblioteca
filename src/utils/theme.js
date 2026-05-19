export const THEME_KEY = "tema";

export function getSavedTheme() {
  if (typeof window === "undefined") {
    return "Claro";
  }
  return localStorage.getItem(THEME_KEY) || "Claro";
}

export function applyTheme(theme) {
  const selectedTheme = theme === "Escuro" ? "Escuro" : "Claro";
  if (typeof window === "undefined") {
    return selectedTheme;
  }
  localStorage.setItem(THEME_KEY, selectedTheme);
  document.documentElement.classList.toggle("dark", selectedTheme === "Escuro");
  return selectedTheme;
}
