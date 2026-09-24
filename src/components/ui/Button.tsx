"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import clsx from "clsx";

type Variant = "primary" | "ghost" | "neon" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "bg-magenta text-white shadow-[0_0_0_1px_rgb(255_46_147/0.6),0_12px_40px_-8px_rgb(209_0_101/0.8)] hover:bg-magenta-hot",
  ghost: "glass text-paper hover:bg-white/10",
  neon: "bg-neon text-void shadow-[0_12px_40px_-10px_rgb(15_236_15/0.7)] hover:bg-neon-soft",
  danger: "bg-danger/15 text-danger ring-1 ring-danger/40 hover:bg-danger/25",
};

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { y: -2 }}
      whileTap={disabled || loading ? undefined : { scale: 0.96, y: 1 }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "relative inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "px-4 py-2 text-sm",
        size === "md" && "px-6 py-3 text-sm sm:text-base",
        size === "lg" && "px-8 py-4 text-base sm:text-lg",
        styles[variant],
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      )}
      {children as React.ReactNode}
    </motion.button>
  );
}
