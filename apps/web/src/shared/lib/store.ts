import { useSyncExternalStore } from "react";

/**
 * Estado global mínimo, persistido no localStorage e compatível com React 18 (useSyncExternalStore).
 * Usado para sessão e carrinho — sem precisar de Redux/Zustand.
 */
export interface Store<T> {
  get(): T;
  set(update: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

export function createPersistentStore<T>(key: string, initial: T): Store<T> {
  let state = read(key, initial);
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set(update) {
      state = typeof update === "function" ? (update as (prev: T) => T)(state) : update;
      write(key, state);
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback; // modo privado / storage indisponível
  }
}

function write<T>(key: string, value: T): void {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignora: o estado continua em memória
  }
}
