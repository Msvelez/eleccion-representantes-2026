"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useElection } from "@/hooks/useElection";
import { useUrlAction } from "@/hooks/useUrlAction";
import { formatBogota } from "@/lib/settings";
import { Button } from "@/components/ui/Button";
import { Countdown } from "@/components/ui/Countdown";
import { Modal } from "@/components/ui/Modal";
import { ApplicationFlow } from "./ApplicationFlow";

const MISSIONS = [
  { icon: "◆", title: "Lidera iniciativas", text: "Convierte ideas en proyectos reales para el programa." },
  { icon: "◎", title: "Conecta estudiantes", text: "Sé el puente entre semestres, docentes y comunidad." },
  { icon: "✦", title: "Deja tu huella", text: "Tu voz queda en la historia de Creación Digital." },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } };
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

/** Silueta de "jugador 2": la tarjeta vacía que invita a postularse. */
function PlayerSlot({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.03, rotate: -1 }}
      whileTap={{ scale: 0.98 }}
      className="group hud relative mx-auto block aspect-[3/4] w-full max-w-[320px] overflow-hidden rounded-3xl bg-plum/60 ring-1 ring-white/10 [--hud-color:var(--color-neon)]"
      aria-label="Quiero postularme"
    >
      <div className="absolute inset-0 grid place-items-center">
        <div className="absolute h-[85%] w-[85%] rounded-full border border-dashed border-magenta/50 motion-safe:animate-spin-slow" />
        <div className="absolute h-[60%] w-[60%] rounded-full border border-neon/30 motion-safe:animate-[spin_12s_linear_infinite_reverse]" />
        <svg viewBox="0 0 100 120" className="relative h-1/2 text-white/15 transition group-hover:text-magenta/60" aria-hidden>
          <circle cx="50" cy="35" r="22" fill="currentColor" />
          <path d="M8 120c0-26 19-44 42-44s42 18 42 44z" fill="currentColor" />
        </svg>
        <span className="absolute text-6xl font-semibold text-paper/90">?</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void to-transparent p-5 text-left">
        <p className="label-hud text-neon">Slot disponible</p>
        <p className="mt-1 text-lg font-medium">¿Serás tú?</p>
        <p className="label-hud mt-3 text-muted motion-safe:animate-pulse">Press start ▸</p>
      </div>
    </motion.button>
  );
}

export function Convocatoria() {
  const { settings } = useElection();
  const { action } = useUrlAction();
  const [open, setOpen] = useState(false);

  // Al volver del enlace de verificación, reabrimos el formulario.
  useEffect(() => {
    if (action === "postular") setOpen(true);
  }, [action]);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full bg-neon/10 px-3 py-1.5 ring-1 ring-neon/40">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-neon" />
              </span>
              <span className="label-hud text-neon">Convocatoria abierta</span>
            </span>
          </motion.div>

          <motion.h1 variants={item} className="text-[clamp(2.4rem,7vw,5.2rem)] leading-[1.02]">
            ¿Quieres <span className="text-gradient">representar</span> a Creación Digital?
          </motion.h1>

          <motion.p variants={item} className="max-w-xl text-lg text-paper/80 sm:text-xl">
            Lidera iniciativas, conecta estudiantes y deja tu huella en el programa.
          </motion.p>

          <motion.div variants={item} className="flex flex-wrap items-center gap-4">
            <Button size="lg" onClick={() => setOpen(true)}>
              Quiero postularme
              <span aria-hidden>→</span>
            </Button>
            <span className="text-sm text-muted">
              Cierra el {formatBogota(settings.applicationsClose)}
            </span>
          </motion.div>

          <motion.div variants={item} className="max-w-xl">
            <Countdown target={settings.applicationsClose} title="Tiempo para postularte" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: 3 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="motion-safe:animate-float"
        >
          <PlayerSlot onClick={() => setOpen(true)} />
        </motion.div>
      </div>

      <motion.ul
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mt-20 grid gap-4 sm:grid-cols-3"
      >
        {MISSIONS.map((m, i) => (
          <motion.li
            key={m.title}
            variants={item}
            whileHover={{ y: -6 }}
            className="glass hud rounded-3xl p-6"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl text-magenta-hot" aria-hidden>
                {m.icon}
              </span>
              <span className="label-hud text-muted">Misión {String(i + 1).padStart(2, "0")}</span>
            </div>
            <h2 className="mt-6 text-xl">{m.title}</h2>
            <p className="mt-2 text-muted">{m.text}</p>
          </motion.li>
        ))}
      </motion.ul>

      <Modal open={open} onClose={() => setOpen(false)} label="Formulario de postulación" className="sm:max-w-4xl">
        <div className="p-6 sm:p-10">
          <ApplicationFlow />
        </div>
      </Modal>
    </section>
  );
}
