"use client";

import { useEffect, useState } from "react";
import { watchApprovedCandidates } from "@/lib/data";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { Candidate } from "@/lib/types";

export function useApprovedCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return watchApprovedCandidates(
      (c) => {
        setCandidates(c);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      },
    );
  }, []);

  return { candidates, loading, error };
}
