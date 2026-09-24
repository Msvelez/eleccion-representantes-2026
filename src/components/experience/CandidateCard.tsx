"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";

interface CardCandidate {
  name: string;
  semester: number;
  photoURL: string;
}

interface CandidateCardProps {
  candidate: CardCandidate;
  index: number;
  active?: boolean;
  compact?: boolean;
  onSelect?: () => void;
  onFocus?: () => void;
  badge?: string;
  /** Para la vista previa del formulario (no interactiva). */
  static?: boolean;
}

/** Tarjeta de "personaje" con inclinación 3D, brillo que sigue al cursor y esquinas HUD. */
export function CandidateCard({
  candidate,
  index,
  active,
  compact,
  onSelect,
  onFocus,
  badge,
  static: isStatic,
}: CandidateCardProps) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 200, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-10, 10]), { stiffness: 200, damping: 18 });
  const glowX = useTransform(mx, (v) => `${v * 100}%`);
  const glowY = useTransform(my, (v) => `${v * 100}%`);
  const glow = useMotionTemplate`radial-gradient(circle at ${glowX} ${glowY}, rgb(255 46 147 / 0.35), transparent 55%)`;

  function onMove(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  }
  function onLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  const code = `P${String(index + 1).padStart(2, "0")}`;
  const Tag = isStatic ? motion.div : motion.button;

  return (
    <Tag
      {...(!isStatic && {
        type: "button" as const,
        onClick: onSelect,
        onFocus,
        onPointerEnter: onFocus,
        "aria-pressed": active,
        "aria-label": `${candidate.name || "Candidato"}, semestre ${candidate.semester}. Ver perfil`,
      })}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      whileHover={isStatic ? undefined : { y: -6, scale: 1.02 }}
      whileTap={isStatic ? undefined : { scale: 0.97 }}
      className={clsx(
        "group hud relative block w-full overflow-hidden rounded-2xl text-left transition-shadow duration-300 [container-type:inline-size]",
        "bg-plum ring-1",
        active
          ? "ring-2 ring-magenta-hot shadow-[0_0_0_4px_rgb(209_0_101/0.25),0_30px_80px_-20px_rgb(209_0_101/0.9)] [--hud-color:var(--color-neon)]"
          : "ring-white/10 hover:ring-magenta/70 hover:shadow-[0_30px_70px_-25px_rgb(209_0_101/0.8)]",
      )}
    >
      <div className={clsx("relative w-full", compact ? "aspect-square" : "aspect-[3/4]")}>
        <Avatar
          name={candidate.name || "?"}
          src={candidate.photoURL}
          className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />
        <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: glow }} />
        {/* Barrido de escaneo */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 transition-opacity group-hover:opacity-100">
          <div className="h-1/3 w-full bg-gradient-to-b from-transparent via-white/10 to-transparent motion-safe:animate-scan" />
        </div>

        <span className="label-hud absolute left-3 top-3 rounded-md bg-void/70 px-2 py-1 text-[0.6rem] text-neon backdrop-blur">
          {code}
        </span>
        {badge && (
          <span className="label-hud absolute right-3 top-3 rounded-md bg-neon px-2 py-1 text-[0.6rem] font-medium text-void">
            {badge}
          </span>
        )}
      </div>

      <div className={clsx("absolute inset-x-0 bottom-0", compact ? "p-2.5" : "p-4")}>
        <p className={clsx("truncate font-medium leading-tight", compact ? "text-xs sm:text-sm" : "text-lg")}>
          {candidate.name || "Tu nombre"}
        </p>
        <p className="label-hud mt-1 text-[0.6rem] text-magenta-soft">
          Semestre {candidate.semester ? String(candidate.semester).padStart(2, "0") : "--"}
        </p>
      </div>
    </Tag>
  );
}
