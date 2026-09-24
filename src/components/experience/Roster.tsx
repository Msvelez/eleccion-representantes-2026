"use client";

import { motion } from "motion/react";
import { useState } from "react";
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

/** Galería de exploración de perfiles (fase de presentación). */
export function Roster({ candidates }: { candidates: Candidate[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const current = selected === null ? null : candidates[selected];

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {candidates.map((c, i) => (
          <UnlockingCard key={c.id} index={i}>
            <CandidateCard candidate={c} index={i} active={selected === i} onSelect={() => setSelected(i)} />
          </UnlockingCard>
        ))}
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
