"use client"

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { auth } from "@/lib/firebase"
import type { Application, ApplicationsResult } from "@/lib/admin-application-list-types"

export const ADMIN_APPLICATIONS_KEY = ["admin", "applications"] as const
export const ADMIN_APPLICATIONS_VIEW_KEY = ["admin", "applications-view"] as const
export type ApplicationsSnapshot = { applications: Application[]; version: string | null }

export async function loadApplicationsSnapshot(previous?: ApplicationsSnapshot, signal?: AbortSignal): Promise<ApplicationsSnapshot> {
  await auth.authStateReady()
  if (!auth.currentUser) throw new Error("Sign in as an administrator to load applications.")
  const token = await auth.currentUser.getIdToken()
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (previous?.version) headers["If-None-Match"] = previous.version
  const response = await fetch("/api/admin/applications", { headers, cache: "no-store", signal })
  if (response.status === 304 && previous) return previous
  if (!response.ok) throw new Error("Unable to load applications. Please try again.")
  const data = await response.json()
  return { applications: data.applications, version: response.headers.get("ETag") }
}

export function adminApplicationsOptions(client: QueryClient, initial?: ApplicationsResult) {
  const queryKey = [...ADMIN_APPLICATIONS_KEY, auth.currentUser?.uid ?? "session"]
  return {
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => loadApplicationsSnapshot(client.getQueryData<ApplicationsSnapshot>(queryKey), signal),
    initialData: initial?.success ? { applications: initial.applications, version: null } : undefined,
    enabled: Boolean(auth.currentUser),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  }
}

export function useAdminApplications(initial?: ApplicationsResult) {
  return useQuery(adminApplicationsOptions(useQueryClient(), initial))
}
