"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { watchResults } from "@/lib/data";
import type { PublishedResults, Winner } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Celebration } from "./Celebration";

/** Pantalla intermedia: votación cerrada, resultados aún sin publicar. */
export function Escrutinio() {
  return (
    <section className="grid min-h-[calc(100dvh-8rem)] place-items-center px-4 py-16 text-center">
      <div className="max-w-2xl space-y-8">
        <div className="relative mx-auto h-40 w-40" aria-hidden>
          <div className="absolute inset-0 rounded-full border border-magenta/40" />
          <div className="absolute inset-6 rounded-full border border-magenta/30" />
          <div className="absolute inset-12 rounded-full border border-neon/40" />
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgb(15_236_15/0.45)_40deg,transparent_60deg)] motion-safe:animate-[spin_2.4s_linear_infinite]" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon" />
        </div>
        <span className="label-hud text-neon">Votación cerrada</span>
        <h1 className="text-4xl sm:text-6xl">Contando votos…</h1>
        <p className="text-lg text-muted">
          Gracias por participar. Los representantes elegidos se revelarán aquí en cuanto se publiquen los resultados.
        </p>
      </div>
    </section>
  );
}

function WinnerCard({ winner, index, highlight }: { winner: Winner; index: number; highlight: boolean }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setPct(winner.percentage), 600 + index * 300);
    return () => window.clearTimeout(t);
  }, [winner.percentage, index]);

  return (
    <motion.li
      initial={{ opacity: 0, y: 80, rotateX: 40 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.4 + index * 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformPerspective: 1000 }}
      className={`glass hud overflow-hidden rounded-3xl ${highlight ? "[--hud-color:var(--color-neon)] ring-2 ring-neon/60 shadow-[0_40px_120px_-30px_rgb(15_236_15/0.5)]" : ""}`}
    >
      <div className="relative aspect-[4/5]">
        <Avatar name={winner.name} src={winner.photoURL} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/20 to-transparent" />
        {winner.role && (
          <span className="label-hud absolute left-4 top-4 rounded-md bg-neon px-2 py-1 font-medium text-void">
            {winner.role}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 space-y-1 p-5">
          <p className="label-hud text-magenta-soft">Semestre {String(winner.semester).padStart(2, "0")}</p>
          <h2 className="text-2xl leading-tight sm:text-3xl">{winner.name}</h2>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-end justify-between">
          <p>
            <span className="text-3xl font-semibold tabular-nums">{winner.votes}</span>{" "}
            <span className="text-muted">votos</span>
          </p>
          <p className="font-mono text-2xl text-neon tabular-nums">{winner.percentage.toFixed(1)}%</p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-white/10"
          role="meter"
          aria-valuenow={winner.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Porcentaje obtenido por ${winner.name}`}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-magenta to-neon"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.li>
  );
}

export function Resultados() {
  const [results, setResults] = useState<PublishedResults | null | undefined>(undefined);
  const [curtain, setCurtain] = useState(true);

  useEffect(() => watchResults(setResults, () => setResults(null)), []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setCurtain(false), reduced ? 0 : 1800);
    return () => window.clearTimeout(t);
  }, []);

  if (results === undefined) return <p className="label-hud p-16 text-center text-muted">Cargando resultados…</p>;
  if (!results || !results.winners.length) return <Escrutinio />;

  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      {/* Transición especial: telón de revelación */}
      <AnimatePresence>
        {curtain && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-void"
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
            aria-hidden
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <p className="label-hud text-neon">Nivel 04 desbloqueado</p>
              <p className="mt-4 text-[clamp(2.5rem,10vw,7rem)] font-semibold leading-none">
                <span className="text-gradient">Resultados</span>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!curtain && <Celebration intensity="grand" />}

      <header className="mb-12 space-y-4 text-center">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="label-hud text-neon">
          Misión cumplida · {results.totalVotes} votos registrados
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-[clamp(2.4rem,7vw,5rem)] leading-[1.05]"
        >
          Representantes <span className="text-gradient">Elegidos</span>
        </motion.h1>
      </header>

      <ul
        className={`mx-auto grid gap-6 ${
          results.winners.length === 1 ? "max-w-sm" : results.winners.length === 2 ? "max-w-3xl sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {results.winners.map((w, i) => (
          <WinnerCard key={w.candidateId} winner={w} index={i} highlight={i === 0} />
        ))}
      </ul>

      <p className="mt-14 text-center text-muted">
        Gracias a todas las personas que se postularon y votaron. Creación Digital lo construimos entre todos.
      </p>
    </section>
  );
}
