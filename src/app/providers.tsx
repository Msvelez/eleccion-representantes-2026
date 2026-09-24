"use client";

import { MotionConfig } from "motion/react";
import { ElectionProvider } from "@/hooks/useElection";
import { SpaceBackground } from "@/components/ui/SpaceBackground";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ElectionProvider>
        <SpaceBackground />
        {children}
      </ElectionProvider>
    </MotionConfig>
  );
}
