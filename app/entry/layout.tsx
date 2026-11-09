import type { Metadata } from "next"
import ArcticBackdrop from "@/components/arctic-backdrop"
import background from "../home.module.css"
import styles from "./entry.module.css"

// Keep native POST Origin headers intact without sharing entry URLs with other sites.
export const metadata: Metadata = {
  title: "Start your application · SheCanCode",
  referrer: "same-origin",
  robots: { index: false, follow: false },
}

export default function EntryLayout({ children }: { children: React.ReactNode }) {
  return <div className={background.page}>
    <div className={background.aura}>
      <ArcticBackdrop />
      <main className={styles.page}><section className={styles.message}>{children}</section></main>
    </div>
  </div>
}
