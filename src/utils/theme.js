export const THEME_KEY = "tema";

let transitionTimer;

export function getSavedTheme() {
  if (typeof window === "undefined") {
    return "Claro";
  }
  return localStorage.getItem(THEME_KEY) || "Claro";
}

export function applyTheme(theme, { animate = true } = {}) {
  const selectedTheme = theme === "Escuro" ? "Escuro" : "Claro";
  if (typeof window === "undefined") {
    return selectedTheme;
  }

  const root = document.documentElement;
  const isDark = selectedTheme === "Escuro";

  localStorage.setItem(THEME_KEY, selectedTheme);
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";

  if (animate) {
    root.classList.add("theme-transition");
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 300);
  }

  return selectedTheme;
}
