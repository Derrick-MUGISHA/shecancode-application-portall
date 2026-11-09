import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import ArcticBackdrop from "./arctic-backdrop"
import background from "@/app/home.module.css"
import styles from "@/app/apply/apply.module.css"

export default function ApplicationShell({ children, sidebar }: { children: ReactNode; sidebar?: ReactNode }) {
  return <div className={background.page}>
    <div className={`${background.aura} ${styles.applicationAura}`}>
      <div className={styles.backdrop} aria-hidden="true"><ArcticBackdrop /></div>
      <div className={styles.content}>
        <a href="#application-content" className={styles.skipLink}>Skip to application form</a>
        <div className={styles.top}>
          <header className={styles.header}>
            <Link href="/" aria-label="SheCanCode application portal home" className={styles.homeLink}>
              <Image src="/logo.png" alt="SheCanCode" width={263} height={191} priority className={styles.logo} />
            </Link>
            <Link href="/" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" />Back to Home</Link>
          </header>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>YOUR NEXT CHAPTER</p>
            <h1 id="application-title">Application Form</h1>
            <p>Your next chapter, in four simple steps.</p>
          </div>
        </div>
        <div className={styles.applicationLayout}>
          <aside id="application-step-navigation" className={styles.stepSidebar} aria-label="Application steps">{sidebar}</aside>
          <main id="application-content" tabIndex={-1} className={styles.panel} aria-labelledby="application-title">{children}</main>
        </div>
        <footer className={styles.footer}>© {new Date().getFullYear()} SheCanCode</footer>
      </div>
    </div>
  </div>
}
