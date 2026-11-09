import { redirect } from "next/navigation"
import { verifyEntryToken } from "@/lib/entry-token"
import AutomaticApplicationEntry from "@/components/automatic-application-entry"

export const dynamic = "force-dynamic"

export default async function EntryPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  try {
    if (!token) throw Error("Entry token required")
    verifyEntryToken(token)
  } catch {
    redirect("/entry/required?error=invalid")
  }
  return <AutomaticApplicationEntry action="/api/application-entry/redeem" token={token} />
}
