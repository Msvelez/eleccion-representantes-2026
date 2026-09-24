"use client";

import { useEffect, useState } from "react";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function split(target: number): CountdownParts {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: diff === 0,
  };
}

/** Devuelve null en el primer render (evita desajustes de hidratación). */
export function useCountdown(target: Date): CountdownParts | null {
  const [parts, setParts] = useState<CountdownParts | null>(null);
  useEffect(() => {
    const t = target.getTime();
    setParts(split(t));
    const id = window.setInterval(() => setParts(split(t)), 1000);
    return () => window.clearInterval(id);
  }, [target]);
  return parts;
}
