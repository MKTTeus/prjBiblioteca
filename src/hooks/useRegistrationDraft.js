import { useCallback, useEffect, useState } from "react";

export function registrationDraftKey(kind, user) {
  return user?.email ? `cadastro-rascunho-v1:${kind}:${encodeURIComponent(user.email.toLowerCase())}` : null;
}

export function readRegistrationDraft(kind, user) {
  const key = registrationDraftKey(kind, user);
  if (!key) return null;
  try {
    const draft = JSON.parse(sessionStorage.getItem(key) || "null");
    return draft?.form && typeof draft.form === "object" ? draft : null;
  } catch { return null; }
}

export default function useRegistrationDraft(kind, user, { open, dirty, form, recordId = null, extra = null }) {
  const key = registrationDraftKey(kind, user);
  const [draft, setDraft] = useState(() => readRegistrationDraft(kind, user));

  useEffect(() => { setDraft(readRegistrationDraft(kind, user)); }, [key]);
  useEffect(() => {
    if (!key || !open || !dirty) return;
    try {
      // Senhas são sempre redigitadas. A aba preserva somente dados do formulário.
      const { senha, ...safeForm } = form;
      sessionStorage.setItem(key, JSON.stringify({ form: safeForm, recordId, extra }));
    } catch { /* Armazenamento cheio ou indisponível: o formulário segue editável. */ }
  }, [key, open, dirty, form, recordId, extra]);

  const clearDraft = useCallback(() => {
    if (key) sessionStorage.removeItem(key);
    setDraft(null);
  }, [key]);

  return { draft, clearDraft };
}
