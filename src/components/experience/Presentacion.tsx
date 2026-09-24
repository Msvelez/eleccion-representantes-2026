"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useElection } from "@/hooks/useElection";
import { useApprovedCandidates } from "@/hooks/useCandidates";
import { Button } from "@/components/ui/Button";
import { Countdown } from "@/components/ui/Countdown";
import { Roster } from "./Roster";

/** Título con efecto de "glitch" suave (solo con movimiento permitido). */
function GlitchTitle({ text }: { text: string }) {
  return (
    <h1 className="relative inline-block text-[clamp(2.6rem,9vw,7rem)] font-semibold leading-none tracking-tight">
      <span className="relative z-10">{text}</span>
      <span
        aria-hidden
        className="absolute inset-0 text-magenta-hot opacity-70 mix-blend-screen motion-safe:animate-[glitch1_2.8s_infinite]"
      >
        {text}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 text-neon opacity-50 mix-blend-screen motion-safe:animate-[glitch2_3.1s_infinite]"
      >
        {text}
      </span>
      <style>{`
        @keyframes glitch1{0%,90%,100%{transform:none;clip-path:inset(0 0 0 0)}92%{transform:translate(-3px,1px);clip-path:inset(10% 0 55% 0)}95%{transform:translate(3px,-1px);clip-path:inset(60% 0 10% 0)}}
        @keyframes glitch2{0%,88%,100%{transform:none;clip-path:inset(0 0 0 0)}90%{transform:translate(3px,0);clip-path:inset(40% 0 30% 0)}94%{transform:translate(-2px,1px);clip-path:inset(5% 0 80% 0)}}
      `}</style>
    </h1>
  );
}

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(value);
    let frame = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1200);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="tabular-nums">{shown}</span>;
}

export function Presentacion() {
  const { settings } = useElection();
  const { candidates, loading } = useApprovedCandidates();
  const [revealed, setRevealed] = useState(false);
  const rosterRef = useRef<HTMLDivElement>(null);

  function reveal() {
    setRevealed(true);
    window.setTimeout(() => rosterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  return (
    <div>
      {/* Pantalla de transición: MISIÓN COMPLETADA */}
      <section className="relative grid min-h-[calc(100dvh-8rem)] place-items-center overflow-hidden px-4 py-16 text-center">
        <motion.div
          aria-hidden
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          className="absolute h-64 w-64 rounded-full border-2 border-neon"
        />
        <div className="relative max-w-4xl space-y-8">
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.6em" }}
            animate={{ opacity: 1, letterSpacing: "0.25em" }}
            transition={{ duration: 1 }}
            className="label-hud text-neon"
          >
            ▸ Nivel 01 superado
          </motion.p>
          <motion.div initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}>
            <GlitchTitle text="MISIÓN COMPLETADA" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            <p className="text-xl text-paper/85 sm:text-2xl">Las postulaciones han finalizado.</p>
            {!loading && candidates.length > 0 && (
              <p className="text-lg text-muted sm:text-xl">
                <strong className="font-semibold text-magenta-hot">
                  <CountUp value={candidates.length} />
                </strong>{" "}
                {candidates.length === 1 ? "candidato ha ingresado" : "candidatos han ingresado"} al proceso de selección.
              </p>
            )}
            {!loading && candidates.length === 0 && (
              <p className="text-lg text-muted">El comité está revisando las postulaciones. Muy pronto conocerás el roster.</p>
            )}
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
            <Button size="lg" onClick={reveal} disabled={candidates.length === 0}>
              Conocer candidatos
              <span aria-hidden>↓</span>
            </Button>
          </motion.div>
        </div>
      </section>

      <AnimatePresence>
        {revealed && (
          <motion.section
            ref={rosterRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto max-w-7xl scroll-mt-24 space-y-10 px-4 pb-24 sm:px-6"
            aria-labelledby="roster-title"
          >
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="space-y-3">
                <span className="label-hud text-neon">Nivel 02 · Explora los perfiles</span>
                <h2 id="roster-title" className="text-4xl sm:text-5xl">
                  Conoce a los <span className="text-gradient">candidatos</span>
                </h2>
                <p className="max-w-xl text-muted">
                  Selecciona una tarjeta para desbloquear el perfil completo: motivación, propuestas y video.
                </p>
              </div>
              <div className="w-full max-w-md">
                <Countdown target={settings.votingStart} title="Las votaciones abren en" />
              </div>
            </div>
            <Roster candidates={candidates} />
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
