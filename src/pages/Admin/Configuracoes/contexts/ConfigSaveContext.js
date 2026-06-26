import { createContext, useContext, useRef, useCallback } from "react";

/**
 * ConfigSaveContext
 *
 * Allows each settings tab to register its own save handler.
 * The parent (Configuracoes) calls saveAll() which invokes every
 * registered handler in parallel and collects per-tab results.
 *
 * This eliminates the fragile setTimeout + DOM-query approach.
 */

const ConfigSaveContext = createContext(null);

export function useConfigSave() {
  const ctx = useContext(ConfigSaveContext);
  if (!ctx) throw new Error("useConfigSave must be used inside ConfigSaveProvider");
  return ctx;
}

/**
 * Each tab calls this hook to register its save function.
 * The returned `registerSave` is stable across renders.
 *
 * @param {string} abaId  - unique tab identifier (e.g. "geral")
 * @param {() => Promise<void>} saveFn - async save function; should throw on failure
 */
export function useRegisterSave(abaId, saveFn) {
  const { registerSave } = useConfigSave();
  // Register on every render so the closure always captures latest state
  registerSave(abaId, saveFn);
}

export function ConfigSaveProvider({ children }) {
  // Map of abaId -> saveFn. Using a ref so mutations don't trigger re-renders.
  const handlersRef = useRef({});

  const registerSave = useCallback((abaId, saveFn) => {
    handlersRef.current[abaId] = saveFn;
  }, []);

  /**
   * Calls all registered save handlers concurrently.
   * Returns an array of { abaId, success, error } results.
   */
  const saveAll = useCallback(async () => {
    const entries = Object.entries(handlersRef.current);
    const results = await Promise.allSettled(
      entries.map(async ([abaId, saveFn]) => {
        await saveFn();
        return abaId;
      })
    );

    return results.map((result, i) => ({
      abaId: entries[i][0],
      success: result.status === "fulfilled",
      error: result.status === "rejected" ? result.reason : null,
    }));
  }, []);

  return (
    <ConfigSaveContext.Provider value={{ registerSave, saveAll }}>
      {children}
    </ConfigSaveContext.Provider>
  );
}