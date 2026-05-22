const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "src");
const skip = new Set(["theme.css"]);

const replacements = [
  [/background:\s*#fee2e2\b/gi, "background: var(--status-danger-bg)"],
  [/background-color:\s*#fee2e2\b/gi, "background-color: var(--status-danger-bg)"],
  [/background:\s*#fef3c7\b/gi, "background: var(--status-warning-bg)"],
  [/background:\s*#fffbeb\b/gi, "background: var(--status-warning-surface)"],
  [/background:\s*#dbeafe\b/gi, "background: var(--status-info-bg)"],
  [/background:\s*#eff6ff\b/gi, "background: var(--status-info-surface)"],
  [/background:\s*#dcfce7\b/gi, "background: var(--status-success-bg)"],
  [/background:\s*#ecfdf5\b/gi, "background: var(--status-success-surface)"],
  [/color:\s*#b91c1c\b/gi, "color: var(--status-danger-text)"],
  [/color:\s*#b45309\b/gi, "color: var(--status-warning-text)"],
  [/color:\s*#1d4ed8\b/gi, "color: var(--status-info-text)"],
  [/color:\s*#15803d\b/gi, "color: var(--status-success-text)"],
  [/color:\s*#16a34a\b/gi, "color: var(--success)"],
  [/color:\s*#dc2626\b/gi, "color: var(--danger)"],
  [/color:\s*#ef4444\b/gi, "color: var(--danger)"],
  [/color:\s*#3b82f6\b/gi, "color: var(--accent-blue)"],
  [/color:\s*#22c55e\b/gi, "color: var(--accent-green)"],
  [/color:\s*#ffffff\b/gi, "color: var(--btn-primary-text)"],
  [/background:\s*#ef4444\b/gi, "background: var(--danger)"],
  [/background-color:\s*#ef4444\b/gi, "background-color: var(--danger)"],
  [/background:\s*#3b82f6\b/gi, "background: var(--accent-blue)"],
  [/background:\s*#22c55e\b/gi, "background: var(--accent-green)"],
  [/border:\s*1px solid #ddd\b/gi, "border: 1px solid var(--input-border-alt)"],
  [/border:\s*1px solid #ccc\b/gi, "border: 1px solid var(--input-border-muted)"],
  [/border-color:\s*#9ca3af\b/gi, "border-color: var(--border-strong)"],
  [/border-color:\s*#cbd5e1\b/gi, "border-color: var(--border-light)"],
  [/border:\s*2px solid #1e3a8a\b/gi, "border: 2px solid var(--primary-strong)"],
  [/outline:\s*2px solid #4a90e2\b/gi, "outline: 2px solid var(--hero-outline)"],
  [/background:\s*rgba\(15,\s*23,\s*42,\s*0\.6\)/g, "background: var(--overlay-bg)"],
  [/box-shadow:\s*0 10px 22px rgba\(15,\s*23,\s*42,\s*0\.1\)/g, "box-shadow: var(--shadow-soft)"],
  [/box-shadow:\s*0 28px 80px rgba\(15,\s*23,\s*42,\s*0\.18\)/g, "box-shadow: var(--shadow-card)"],
  [/background:\s*linear-gradient\(135deg,\s*#3b82f6,\s*#2563eb\)/g, "background: linear-gradient(135deg, var(--accent-blue), var(--primary))"],
  [/background:\s*linear-gradient\(135deg,\s*#22c55e,\s*#16a34a\)/g, "background: linear-gradient(135deg, var(--accent-green), var(--success))"],
  [/background:\s*linear-gradient\(135deg,\s*#f97316,\s*#ea580c\)/g, "background: linear-gradient(135deg, var(--accent-orange), var(--warning))"],
  [/background:\s*linear-gradient\(135deg,\s*#ef4444,\s*#dc2626\)/g, "background: linear-gradient(135deg, var(--accent-red), var(--danger))"],
  [/background:\s*linear-gradient\(135deg,\s*#ef4444,\s*#b91c1c\)/g, "background: linear-gradient(135deg, var(--accent-red), var(--status-danger-text))"],
  [/background:\s*linear-gradient\(135deg,\s*#3b82f6,\s*#1d4ed8\)/g, "background: linear-gradient(135deg, var(--accent-blue), var(--info))"],
  [/background:\s*linear-gradient\(135deg,\s*#22c55e,\s*#15803d\)/g, "background: linear-gradient(135deg, var(--accent-green), var(--status-success-text))"],
  [/background:\s*linear-gradient\(135deg,\s*#f59e0b,\s*#d97706\)/g, "background: linear-gradient(135deg, var(--warning), var(--status-warning-text))"],
  [/border:\s*1px solid #d9d9df\b/gi, "border: 1px solid var(--surface-border)"],
  [/border:\s*1px solid #d7deea\b/gi, "border: 1px solid var(--surface-border)"],
  [/border:\s*1px solid #eef2f7\b/gi, "border: 1px solid var(--surface-muted)"],
  [/border-bottom:\s*1px solid #eee\b/gi, "border-bottom: 1px solid var(--surface-border)"],
  [/border-top:\s*1px solid #e5e7eb\b/gi, "border-top: 1px solid var(--surface-border)"],
  [/border-color:\s*#b7c6dd\b/gi, "border-color: var(--border-strong)"],
  [/border:\s*1px dashed #cbd5e1\b/gi, "border: 1px dashed var(--border-light)"],
  [/border:\s*2px dashed #d1d5db\b/gi, "border: 2px dashed var(--input-border)"],
  [/background:\s*#f3f4f8\b/gi, "background: var(--surface-muted)"],
  [/background:\s*#e9edf6\b/gi, "background: var(--surface-hover)"],
  [/background:\s*#e0f2fe\b/gi, "background: var(--primary-muted)"],
  [/background:\s*#0f172a\b/gi, "background: var(--btn-dark-bg)"],
  [/background:\s*#e11d48\b/gi, "background: var(--danger)"],
  [/background-color:\s*#f8f8f8\b/gi, "background-color: var(--surface-muted)"],
  [/background-color:\s*#111\b/gi, "background-color: var(--btn-dark-bg)"],
  [/background-color:\s*#dbeafe\b/gi, "background-color: var(--status-info-bg)"],
  [/background:\s*linear-gradient\(180deg,\s*#eff4fb 0%,\s*#dce6f3 100%\)/g, "background: linear-gradient(180deg, var(--surface-muted) 0%, var(--surface-hover) 100%)"],
  [/background:\s*linear-gradient\(180deg,\s*#fbfcfe 0%,\s*#f8fafc 100%\)/g, "background: linear-gradient(180deg, var(--surface-muted) 0%, var(--canvas-bg) 100%)"],
  [/background:\s*linear-gradient\(180deg,\s*#f8fafc 0%,\s*#eef2f6 100%\)/g, "background: linear-gradient(180deg, var(--surface-muted) 0%, var(--main-bg) 100%)"],
  [/border:\s*1px solid #d7dee8\b/gi, "border: 1px solid var(--surface-border)"],
  [/box-shadow:\s*inset 3px 0 0 #2563eb\b/gi, "box-shadow: inset 3px 0 0 var(--primary)"],
  [/box-shadow:\s*inset 0 0 0 1px #c7cedb\b/gi, "box-shadow: inset 0 0 0 1px var(--border-light)"],
  [/color:\s*#f97316\b/gi, "color: var(--warning)"],
  [/color:\s*#ea580c\b/gi, "color: var(--warning)"],
  [/color:\s*#1e40af\b/gi, "color: var(--status-info-text)"],
  [/color:\s*#777\b/gi, "color: var(--text-muted)"],
  [/color:\s*#111\b/gi, "color: var(--text-default)"],
  [/color:\s*#1a1a1a\b/gi, "color: var(--text-default)"],
  [/color:\s*#4a87ff\b/gi, "color: var(--primary)"],
  [/border:\s*1px solid #dcdcdc\b/gi, "border: 1px solid var(--input-border)"],
  [/border-color:\s*#4a87ff\b/gi, "border-color: var(--primary)"],
  [/border:\s*1px dashed #ccc\b/gi, "border: 1px dashed var(--input-border-muted)"],
  [/background:\s*#f0f0f0\b/gi, "background: var(--surface-hover)"],
  [/background:\s*#e0e0e0\b/gi, "background: var(--surface-border)"],
  [/background:\s*#4a87ff\b/gi, "background: var(--primary)"],
  [/background:\s*#3a6fe0\b/gi, "background: var(--primary-hover)"],
  [/color:\s*#fff\b/gi, "color: var(--btn-primary-text)"],
  [/background-color:\s*#ff3616\b/gi, "background-color: var(--danger)"],
  [/border:\s*1\.5px solid #e5e7eb\b/gi, "border: 1.5px solid var(--surface-border)"],
  [/border-color:\s*#6366f1\b/gi, "border-color: var(--input-focus-border)"],
  [/border-color:\s*#bfdbfe\b/gi, "border-color: var(--primary-muted)"],
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".css")) files.push(p);
  }
  return files;
}

let count = 0;
for (const file of walk(root)) {
  if (skip.has(path.basename(file))) continue;
  let content = fs.readFileSync(file, "utf8");
  const orig = content;
  for (const [re, rep] of replacements) content = content.replace(re, rep);
  if (content !== orig) {
    fs.writeFileSync(file, content);
    count += 1;
    console.log(path.relative(root, file));
  }
}
console.log("Updated", count, "files");
