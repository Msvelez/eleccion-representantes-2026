/** Fondo espacial fijo: resplandores, estrellas deterministas y rejilla en perspectiva. */

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(20261015);
const STARS = Array.from({ length: 90 }, () => ({
  x: rand() * 100,
  y: rand() * 100,
  size: rand() < 0.85 ? 1 : 2,
  opacity: 0.25 + rand() * 0.6,
  delay: rand() * 6,
}));

export function SpaceBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-void">
      <div className="absolute -left-1/4 -top-1/3 h-[80vmax] w-[80vmax] rounded-full bg-[radial-gradient(circle,rgb(209_0_101/0.28),transparent_60%)]" />
      <div className="absolute -bottom-1/3 -right-1/4 h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(circle,rgb(58_10_34/0.9),transparent_65%)]" />
      <div className="absolute bottom-[-10%] left-1/2 h-[40vmax] w-[60vmax] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(15_236_15/0.06),transparent_60%)]" />

      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white motion-safe:animate-[twinkle_6s_ease-in-out_infinite]"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {/* Rejilla tipo "suelo" de videojuego */}
      <div className="absolute inset-x-0 bottom-0 h-[45vh] [perspective:600px]">
        <div
          className="absolute inset-x-[-50%] bottom-[-20%] h-[160%] origin-bottom [transform:rotateX(62deg)] opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgb(209 0 101 / 0.45) 1px, transparent 1px), linear-gradient(90deg, rgb(209 0 101 / 0.45) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "linear-gradient(to top, black 10%, transparent 75%)",
            WebkitMaskImage: "linear-gradient(to top, black 10%, transparent 75%)",
          }}
        />
      </div>

      <div className="scanlines absolute inset-0 opacity-40" />
      <style>{`@keyframes twinkle{0%,100%{opacity:.15}50%{opacity:.9}}`}</style>
    </div>
  );
}
