"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCountdown } from "@/hooks/useCountdown";
import { formatBogota } from "@/lib/settings";

function Unit({ value, label }: { value: number | null; label: string }) {
  const text = value === null ? "--" : String(value).padStart(2, "0");
  return (
    <div className="glass hud flex min-w-0 flex-1 flex-col items-center rounded-2xl px-2 py-3 [--hud-color:var(--color-neon)] sm:px-4 sm:py-4">
      <div className="relative h-9 overflow-hidden font-mono text-3xl font-medium tabular-nums text-paper sm:h-12 sm:text-5xl">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="block leading-none"
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="label-hud mt-2 text-[0.6rem] text-muted sm:text-[0.65rem]">{label}</span>
    </div>
  );
}

export function Countdown({ target, title }: { target: Date; title: string }) {
  const parts = useCountdown(target);
  return (
    <section aria-label={`${title}: ${formatBogota(target)}`} className="w-full">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="label-hud whitespace-nowrap text-neon">{title}</span>
        <span className="label-hud hidden truncate text-right text-muted sm:inline">{formatBogota(target)}</span>
      </div>
      <div className="flex gap-2 sm:gap-3" aria-hidden>
        <Unit value={parts?.days ?? null} label="días" />
        <Unit value={parts?.hours ?? null} label="horas" />
        <Unit value={parts?.minutes ?? null} label="min" />
        <Unit value={parts?.seconds ?? null} label="seg" />
      </div>
    </section>
  );
}
