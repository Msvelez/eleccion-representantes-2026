"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useElection } from "@/hooks/useElection";
import type { Phase } from "@/lib/types";
import { Marquee } from "@/components/ui/Marquee";
import { TopBar } from "@/components/ui/TopBar";
import { Convocatoria } from "./Convocatoria";
import { Presentacion } from "./Presentacion";
import { Votacion } from "./Votacion";
import { Escrutinio, Resultados } from "./Resultados";

const MARQUEE: Record<Phase, string[]> = {
  convocatoria: ["Convocatoria abierta", "Lidera", "Conecta", "Crea", "Representa", "Creación Digital"],
  presentacion: ["Conoce a los candidatos", "Explora", "Desbloquea perfiles", "Creación Digital"],
  votacion: ["Votación abierta", "Un correo · un voto", "Elige", "Creación Digital"],
  escrutinio: ["Votación cerrada", "Contando votos", "Creación Digital"],
  resultados: ["Representantes elegidos", "Misión cumplida", "Creación Digital"],
};

function BootScreen() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status">
      <div className="w-56 space-y-3 text-center">
        <p className="label-hud text-muted">Cargando misión</p>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 animate-[marquee_1.1s_linear_infinite] bg-magenta-hot" />
        </div>
      </div>
    </div>
  );
}

function ConfigNotice({ message }: { message: string }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="glass hud max-w-lg space-y-4 rounded-3xl p-8">
        <span className="label-hud text-danger">Sistema sin conexión</span>
        <h1 className="text-2xl">No pudimos cargar la misión</h1>
        <p className="text-muted">{message}</p>
      </div>
    </div>
  );
}

function PhaseView({ phase }: { phase: Phase }) {
  switch (phase) {
    case "convocatoria":
      return <Convocatoria />;
    case "presentacion":
      return <Presentacion />;
    case "votacion":
      return <Votacion />;
    case "escrutinio":
      return <Escrutinio />;
    case "resultados":
      return <Resultados />;
  }
}

/** Orquesta la experiencia: detecta la fase y hace la transición entre pantallas. */
export function Experience() {
  const { phase, loading, error, previewing } = useElection();

  if (error) return <ConfigNotice message={error} />;
  if (loading) return <BootScreen />;

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <Marquee items={MARQUEE[phase]} />
      {previewing && (
        <p className="label-hud bg-magenta py-1 text-center text-white">
          Vista previa de fase: {phase} (solo desarrollo)
        </p>
      )}
      <main id="contenido" className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, filter: "blur(12px)" }}
            // Al terminar se quita el filtro: un filter en un ancestro rompe los elementos position: fixed.
            animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
            exit={{ opacity: 0, filter: "blur(12px)", scale: 0.98 }}
            transition={{ duration: 0.6 }}
          >
            <PhaseView phase={phase} />
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <p>Hecho por estudiantes de Creación Digital · Universidad El Bosque</p>
          <Link href="/admin" className="label-hud transition hover:text-paper">
            Administración
          </Link>
        </div>
      </footer>
    </div>
  );
}
