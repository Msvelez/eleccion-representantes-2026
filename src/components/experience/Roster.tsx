"use client";

import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import type { Candidate } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { CandidateCard } from "./CandidateCard";
import { CandidateProfile } from "./CandidateProfile";

/** Carta boca abajo que se "desbloquea" (voltea) al aparecer. */
function UnlockingCard({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, rotateY: -90, y: 30 }}
      whileInView={{ opacity: 1, rotateY: 0, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 8) * 0.07, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformPerspective: 1000 }}
    >
      {children}
    </motion.li>
  );
}

/**
 * Galería de exploración de perfiles (sala de candidatos y fase de presentación).
 * @param badge etiqueta en cada tarjeta, p. ej. "Listo"
 * @param idle las tarjetas flotan suavemente, como personajes esperando
 * @param trailing elemento extra al final de la cuadrícula (p. ej. un espacio libre)
 */
export function Roster({
  candidates,
  badge,
  idle,
  trailing,
}: {
  candidates: Candidate[];
  badge?: string;
  idle?: boolean;
  trailing?: ReactNode;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const current = selected === null ? null : candidates[selected];

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {candidates.map((c, i) => (
          <UnlockingCard key={c.id} index={i}>
            <div
              className={idle ? "motion-safe:animate-float" : undefined}
              style={idle ? { animationDelay: `${(i % 5) * -1.4}s` } : undefined}
            >
              <CandidateCard
                candidate={c}
                index={i}
                badge={badge}
                active={selected === i}
                onSelect={() => setSelected(i)}
              />
            </div>
          </UnlockingCard>
        ))}
        {trailing && <li>{trailing}</li>}
      </ul>

      <Modal
        open={current !== null}
        onClose={() => setSelected(null)}
        label={current ? `Perfil de ${current.name}` : "Perfil"}
        className="sm:max-w-5xl"
      >
        {current && selected !== null && (
          <>
            <CandidateProfile candidate={current} index={selected} />
            {candidates.length > 1 && (
              <div className="flex justify-between gap-3 border-t border-white/10 p-4 sm:px-8">
                <button
                  className="label-hud rounded-full px-4 py-2 text-muted transition hover:bg-white/10 hover:text-paper"
                  onClick={() => setSelected((selected - 1 + candidates.length) % candidates.length)}
                >
                  ◂ Anterior
                </button>
                <button
                  className="label-hud rounded-full px-4 py-2 text-muted transition hover:bg-white/10 hover:text-paper"
                  onClick={() => setSelected((selected + 1) % candidates.length)}
                >
                  Siguiente ▸
                </button>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
