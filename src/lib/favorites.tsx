"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface FavoritesContextValue {
  favorites: string[];
  isFavorite: (path: string) => boolean;
  toggle: (path: string) => void;
  add: (path: string) => void;
  remove: (path: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const STORAGE_KEY = "app-favorites";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setFavorites(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const isFavorite = useCallback((path: string) => favorites.includes(path), [favorites]);

  const toggle = useCallback((path: string) => {
    setFavorites((prev) =>
      prev.includes(path) ? prev.filter((f) => f !== path) : [...prev, path]
    );
  }, []);

  const add = useCallback((path: string) => {
    setFavorites((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }, []);

  const remove = useCallback((path: string) => {
    setFavorites((prev) => prev.filter((f) => f !== path));
  }, []);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggle, add, remove }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside FavoritesProvider");
  return ctx;
}
