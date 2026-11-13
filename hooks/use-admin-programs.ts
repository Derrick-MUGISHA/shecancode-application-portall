"use client"

import { auth } from "@/lib/firebase"
import type { Program } from "@/lib/program-types"

export const ADMIN_PROGRAMS_KEY = ["admin", "programs"] as const
export function adminProgramsOptions() {
  return {
    queryKey: [...ADMIN_PROGRAMS_KEY, auth.currentUser?.uid ?? "session"],
    queryFn: async ({ signal }: { signal: AbortSignal }): Promise<Program[]> => {
      const response = await fetch("/api/courses", { cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) })
      if (!response.ok) throw new Error("Unable to load programs.")
      return response.json()
    },
    staleTime: 2000,
    gcTime: 30 * 60 * 1000,
    retry: false as const,
  }
}
