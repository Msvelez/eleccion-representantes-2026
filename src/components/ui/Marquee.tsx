/** Cinta en movimiento — guiño directo al marquee verde de la página oficial del programa. */
export function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const row = [...items, ...items];
  return (
    <div className={`relative overflow-hidden bg-neon py-2 text-void ${className}`} aria-hidden>
      <div className="flex w-max animate-marquee gap-6 whitespace-nowrap">
        {[...row, ...row].map((item, i) => (
          <span key={i} className="label-hud flex items-center gap-6 text-[0.72rem] font-medium tracking-[0.25em]">
            {item}
            <span className="text-magenta">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
