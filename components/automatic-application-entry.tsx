"use client"

import { useEffect, useRef } from "react"
import { ApplicationEntrySkeleton } from "./application-skeletons"

export default function AutomaticApplicationEntry({ action, token }: { action: string; token?: string }) {
  const form = useRef<HTMLFormElement>(null)
  const submitted = useRef(false)

  useEffect(() => {
    if (submitted.current || !form.current) return
    submitted.current = true
    // Native POST keeps the existing origin checks, session cookie, and redirect.
    form.current.requestSubmit()
  }, [])

  return <>
    <ApplicationEntrySkeleton />
    <form ref={form} method="post" action={action}>
      {token && <input type="hidden" name="token" value={token} />}
      <noscript><button type="submit" className="min-h-11 rounded-lg bg-[#193f60] px-5 py-3 font-medium text-white">Open application</button></noscript>
    </form>
  </>
}
