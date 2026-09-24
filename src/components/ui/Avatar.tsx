"use client";

import { useState } from "react";
import clsx from "clsx";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** Foto del candidato con respaldo de iniciales si no hay imagen o si falla la carga. */
export function Avatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);

  if (src && failed !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Foto de ${name}`}
        className={clsx("object-cover", className)}
        loading="lazy"
        onError={() => setFailed(src)}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={`Iniciales de ${name}`}
      className={clsx(
        "grid place-items-center bg-[linear-gradient(135deg,var(--color-magenta),var(--color-plum))] font-semibold text-white/90 [container-type:size]",
        className,
      )}
    >
      <span className="text-[clamp(0.9rem,28cqmin,5rem)] tracking-tight">{initials(name) || "?"}</span>
    </div>
  );
}
