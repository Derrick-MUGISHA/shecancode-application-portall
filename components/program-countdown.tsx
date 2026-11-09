"use client"
import { useEffect, useState } from "react"
import { Clock3 } from "lucide-react"
import { countdownParts } from "@/lib/program-availability"
import styles from "./application-wizard.module.css"

export default function ProgramCountdown({ closesAt, serverTime, onExpired }: {
  closesAt: string | null | undefined; serverTime?: string; onExpired?: () => void
}) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const offset = serverTime ? new Date(serverTime).getTime() - Date.now() : 0
    let notified = false
    const tick = () => {
      const time = Date.now() + offset
      setNow(time)
      if (!notified && closesAt && new Date(closesAt).getTime() <= time) { notified = true; onExpired?.() }
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [closesAt, serverTime, onExpired])
  if (!closesAt) return <span className={styles.countdown}><Clock3 size={15} aria-hidden="true" />Data not available</span>
  const parts = now == null ? null : countdownParts(closesAt, now)
  const exactDate = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kigali", dateStyle: "medium", timeStyle: "short" }).format(new Date(closesAt))
  return <span className={styles.countdown} title={`Closes ${exactDate} (Kigali)`}>
    <Clock3 size={15} aria-hidden="true" />
    <span>{!parts ? "Calculating closing time…" : parts.expired ? "Applications closed" :
      `${parts.days}d ${String(parts.hours).padStart(2,"0")}h ${String(parts.minutes).padStart(2,"0")}m ${String(parts.seconds).padStart(2,"0")}s left`}</span>
    <time dateTime={closesAt} className="sr-only">Closes {exactDate} Kigali time</time>
  </span>
}
