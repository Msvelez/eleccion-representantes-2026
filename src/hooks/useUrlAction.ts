"use client";

import { useEffect, useState } from "react";

/**
 * Lee (y limpia) parámetros de acción de la URL, p. ej. "/?accion=votar&candidato=abc",
 * usados para retomar el flujo al volver del enlace de verificación por correo.
 */
export function useUrlAction(): { action: string | null; candidate: string | null } {
  const [state, setState] = useState<{ action: string | null; candidate: string | null }>({
    action: null,
    candidate: null,
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    const action = url.searchParams.get("accion");
    if (!action) return;
    setState({ action, candidate: url.searchParams.get("candidato") });
    url.searchParams.delete("accion");
    url.searchParams.delete("candidato");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  return state;
}
