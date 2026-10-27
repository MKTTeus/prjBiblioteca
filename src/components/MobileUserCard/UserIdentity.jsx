import React from "react";

const tones = ["blue", "violet", "amber", "mint", "rose", "cyan"];
function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || "?").slice(0, 2)).toUpperCase();
}
export function UserAvatar({ name, className = "" }) {
  const hash = Array.from(String(name || "")).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return <span className={`directory-avatar directory-avatar--${tones[hash % tones.length]} ${className}`.trim()} aria-hidden="true">{initials(name)}</span>;
}
export function UserStatus({ status }) {
  const active = status === "Ativo";
  return <span className={`directory-status ${active ? "directory-status--active" : "directory-status--inactive"}`}>
    <span className="directory-status-dot" aria-hidden="true" />{status || "Inativo"}
  </span>;
}
export function UserProfile({ profile }) {
  return <span className={`directory-profile ${profile === "Professor" ? "directory-profile--teacher" : ""}`}>{profile || "—"}</span>;
}
