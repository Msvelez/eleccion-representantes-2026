"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

const COLORS = ["#d10065", "#ff2e93", "#0fec0f", "#fafafa", "#ff8cc2"];

/** Lluvia de confeti con los colores del programa. Respeta "reducir movimiento". */
export function Celebration({ intensity = "normal" }: { intensity?: "normal" | "grand" }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const burst = (x: number, angle: number) =>
      confetti({
        particleCount: intensity === "grand" ? 90 : 55,
        angle,
        spread: 70,
        startVelocity: 55,
        origin: { x, y: 0.75 },
        colors: COLORS,
        shapes: ["square", "circle"],
        zIndex: 60,
        disableForReducedMotion: true,
      });

    burst(0.1, 60);
    burst(0.9, 120);
    if (intensity !== "grand") return;

    const end = Date.now() + 2200;
    let frame = 0;
    const loop = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: COLORS, zIndex: 60 });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: COLORS, zIndex: 60 });
      if (Date.now() < end) frame = requestAnimationFrame(loop);
    };
    const timer = window.setTimeout(loop, 400);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [intensity]);

  return null;
}
