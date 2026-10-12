import React from "react";

// Formatação restrita: o texto continua escapado pelo React. Links e HTML
// enviados pelo modelo ou por dados do catálogo nunca viram elementos ativos.
function inline(text) {
  return String(text).split(/(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`)/g).map((part, index) => {
    if (/^\*\*[^*\n]+\*\*$/.test(part) || /^__[^_\n]+__$/.test(part)) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (/^`[^`\n]+`$/.test(part)) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export default function NoviMessage({ texto }) {
  return <div className="novi-markdown">{String(texto || "").split("\n").map((line, index) => {
    const item = line.match(/^\s*(?:([-*])|(\d+)[.)])\s+(.+)$/);
    if (item) return <div className="novi-markdown-item" key={index}>
      <span aria-hidden="true">{item[2] ? `${item[2]}.` : "•"}</span><span>{inline(item[3])}</span>
    </div>;
    return <div className="novi-markdown-line" key={index}>{inline(line)}</div>;
  })}</div>;
}
