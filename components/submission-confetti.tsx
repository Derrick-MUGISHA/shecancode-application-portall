"use client"

import { useEffect, useRef } from "react"
import styles from "@/app/apply/success/success.module.css"

export default function SubmissionConfetti() {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!canvas.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let cancelled = false
    let stop: (() => void) | undefined
    let secondBurst: ReturnType<typeof setTimeout> | undefined
    // Load the celebration only on the confirmation page, after saving succeeds.
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled || !canvas.current) return
      const party = confetti.create(canvas.current, { resize: true })
      stop = () => party.reset()
      const options = {
        spread: 65, startVelocity: 48, gravity: 1.05, ticks: 220,
        colors: ["#3a86c8", "#35bcb0", "#f7c948", "#c889d9", "#ef8c91"],
        disableForReducedMotion: true,
      }
      const burst = (particleCount: number) => {
        void party({ ...options, particleCount, angle: 60, origin: { x: 0, y: 0.75 } })
        void party({ ...options, particleCount, angle: 120, origin: { x: 1, y: 0.75 } })
      }
      burst(85)
      secondBurst = setTimeout(() => burst(40), 240)
    }).catch(() => { /* The saved application remains successful if animation fails to load. */ })
    return () => {
      cancelled = true
      if (secondBurst) clearTimeout(secondBurst)
      stop?.()
    }
  }, [])
  return <canvas ref={canvas} className={styles.confetti} aria-hidden="true" />
}
