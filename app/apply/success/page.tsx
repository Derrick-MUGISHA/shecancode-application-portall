import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Check } from "lucide-react"
import ArcticBackdrop from "@/components/arctic-backdrop"
import SubmissionConfetti from "@/components/submission-confetti"
import styles from "./success.module.css"

export const metadata: Metadata = { title: "Application received | SheCanCode" }

export default function SuccessPage() {
  return <main className={styles.page} aria-labelledby="success-title">
    <div className={styles.backdrop} aria-hidden="true"><ArcticBackdrop /></div>
    <SubmissionConfetti />
    <section className={styles.card}>
      <Image src="/logo.png" alt="SheCanCode" width={263} height={191} className={styles.logo} priority />
      <Check className={styles.check} aria-hidden="true" />
      <h1 id="success-title">You’re one step closer!</h1>
      <p>Your application has been submitted successfully. Thank you for taking this step with SheCanCode. Our team will review your application and contact you about what comes next.</p>
      <Link href="/">Return to Home <ArrowRight size={16} aria-hidden="true" /></Link>
    </section>
  </main>
}
