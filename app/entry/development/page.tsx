import { notFound, redirect } from "next/navigation"
import { cookies, headers } from "next/headers"
import { ENTRY_COOKIE, isLocalDevelopmentPortal, portalOrigin } from "@/lib/entry-token"
import { entrySessionFromCookie } from "@/lib/entry-session"
import AutomaticApplicationEntry from "@/components/automatic-application-entry"

export const dynamic = "force-dynamic"

export default async function DevelopmentEntry() {
  if (!isLocalDevelopmentPortal()) notFound()
  if ((await headers()).get("host") !== new URL(portalOrigin()).host) notFound()
  const entry = await entrySessionFromCookie((await cookies()).get(ENTRY_COOKIE)?.value)
  if (entry) redirect("/apply")
  return <AutomaticApplicationEntry action="/api/application-entry/development" />
}
