"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebase, isFirebaseConfigured } from "@/lib/firebase";
import { watchSettings } from "@/lib/data";
import { computePhase, nextTransition, PHASES } from "@/lib/phase";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { Phase, Settings } from "@/lib/types";

interface ElectionState {
  settings: Settings;
  phase: Phase;
  /** true cuando la fase viene forzada por ?fase= (solo desarrollo). */
  previewing: boolean;
  loading: boolean;
  error: string | null;
  user: User | null;
  authLoading: boolean;
}

const ElectionContext = createContext<ElectionState | null>(null);

const previewAllowed =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ALLOW_PHASE_PREVIEW === "true";

function readPreview(): Phase | null {
  if (!previewAllowed || typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("fase");
  return PHASES.includes(value as Phase) ? (value as Phase) : null;
}

export function ElectionProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(
    isFirebaseConfigured ? null : "Firebase no está configurado. Copia .env.example como .env.local (ver README).",
  );
  const [now, setNow] = useState(() => new Date());
  const [preview, setPreview] = useState<Phase | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);

  useEffect(() => setPreview(readPreview()), []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubSettings = watchSettings(
      (s) => {
        setSettings(s);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      },
    );
    const unsubAuth = onAuthStateChanged(firebase().auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => {
      unsubSettings();
      unsubAuth();
    };
  }, []);

  const realPhase = computePhase(settings, now);

  // Programa un "tick" exacto para el siguiente cambio de fase (p. ej. 00:00 del 15 de octubre):
  // la plataforma cambia de pantalla sola, sin recargar.
  useEffect(() => {
    const next = nextTransition(settings, realPhase);
    if (!next) return;
    const ms = next.getTime() - Date.now();
    // setTimeout admite como máximo ~24,8 días; si falta más, se vuelve a programar.
    const timer = window.setTimeout(() => setNow(new Date()), Math.min(Math.max(ms + 50, 0), 2 ** 31 - 1));
    return () => window.clearTimeout(timer);
  }, [settings, realPhase, now]);

  // Al volver a la pestaña, recalcula (los temporizadores se pausan en segundo plano).
  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && setNow(new Date());
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  const value = useMemo<ElectionState>(
    () => ({
      settings,
      phase: preview ?? realPhase,
      previewing: preview !== null,
      loading,
      error,
      user,
      authLoading,
    }),
    [settings, preview, realPhase, loading, error, user, authLoading],
  );

  return <ElectionContext.Provider value={value}>{children}</ElectionContext.Provider>;
}

export function useElection(): ElectionState {
  const ctx = useContext(ElectionContext);
  if (!ctx) throw new Error("useElection debe usarse dentro de <ElectionProvider>");
  return ctx;
}
