import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { entrySessionFromCookie } from "@/lib/entry-session"
import { ENTRY_COOKIE, isLocalDevelopmentPortal, portalOrigin } from "@/lib/entry-token"
import type { Metadata } from "next"
import ApplicationForm from "@/components/application-form"
import ApplicationShell from "@/components/application-shell"
import { applicationStepFromQuery } from "@/lib/application-storage"
import { getPreloadedPrograms } from "@/lib/program-data"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Apply - Applicant Registration System",
  description: "Submit your application for our courses",
}

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const entry=await entrySessionFromCookie((await cookies()).get(ENTRY_COOKIE)?.value)
  if(!entry){
    const local = isLocalDevelopmentPortal() && (await headers()).get("host") === new URL(portalOrigin()).host
    redirect(local ? "/entry/development" : "/entry/required")
  }
  const query = await searchParams
  const initialStep = query.step === undefined ? undefined : applicationStepFromQuery(query.step)
  const initialPrograms = await getPreloadedPrograms().catch(() => undefined)
  return <ApplicationShell>
    <p className="mb-5 text-center text-sm text-slate-600">You arrived from <strong>{entry.sourceDomain}</strong></p>
    <ApplicationForm initialPrograms={initialPrograms} initialStep={initialStep} />
  </ApplicationShell>
}
