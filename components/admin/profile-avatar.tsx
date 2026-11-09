"use client"

import { Blobatar } from "@blobatar/react"
import { UserRound } from "lucide-react"

export default function ProfileAvatar({ id, hidden = false, size = 36 }: { id: string; hidden?: boolean; size?: number }) {
  return <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100" style={{ width: size, height: size }}>
    {hidden ? <UserRound size={Math.round(size * .5)} className="text-slate-400" />
      : <Blobatar name={`applicant:${id}`} size={size} alt="" />}
  </span>
}
