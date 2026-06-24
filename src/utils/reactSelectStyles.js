function readCssVar(name) {
  if (typeof window === "undefined") {
    return "";
  }
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function getReactSelectStyles() {
  const surfaceBg = readCssVar("--input-bg") || "#ffffff";
  const border = readCssVar("--input-border") || "#e5e7eb";
  const text = readCssVar("--text-default") || "#111827";
  const hover = readCssVar("--select-option-hover") || "#e5e7eb";
  const menuBg = readCssVar("--select-menu-bg") || surfaceBg;
  const focusBorder = readCssVar("--input-focus-border") || readCssVar("--primary") || "#2563eb";
  const focusRing = readCssVar("--focus-ring") || "rgba(37, 99, 235, 0.12)";

  return {
    control: (base, state) => ({
      ...base,
      backgroundColor: surfaceBg,
      border: `1px solid ${border}`,
      borderRadius: "8px",
      minHeight: "43px",
      padding: 0,
      boxShadow: "none",
      color: text,
      fontSize: "14px",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      "&:hover": {
        borderColor: border,
      },
      ...(state.isFocused && {
        borderColor: focusBorder,
        boxShadow: `0 0 0 3px ${focusRing}`,
      }),
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "10px 12px",
    }),
    indicatorsContainer: (base) => ({
      ...base,
      minHeight: "41px",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: readCssVar("--text-label") || "#374151",
      padding: "0 12px",
      "&:hover": {
        color: text,
      },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: menuBg,
      borderRadius: "10px",
      overflow: "hidden",
      border: `1px solid ${border}`,
      zIndex: 20,
    }),
    menuList: (base) => ({
      ...base,
      backgroundColor: menuBg,
      padding: 0,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused || state.isSelected ? hover : menuBg,
      color: text,
      padding: "10px",
      cursor: "pointer",
    }),
    singleValue: (base) => ({
      ...base,
      color: text,
      margin: 0,
    }),
    input: (base) => ({
      ...base,
      color: text,
      margin: 0,
      padding: 0,
    }),
    placeholder: (base) => ({
      ...base,
      color: readCssVar("--text-muted") || "#64748b",
    }),
  };
}
