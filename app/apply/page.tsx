import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { entrySessionFromCookie } from "@/lib/entry-session"
import { ENTRY_COOKIE, isLocalDevelopmentPortal, portalOrigin } from "@/lib/entry-token"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import ApplicationForm from "@/components/application-form"
import ArcticBackdrop from "@/components/arctic-backdrop"
import background from "../home.module.css"
import { applicationStepFromQuery } from "@/lib/application-storage"
import { getPreloadedPrograms } from "@/lib/program-data"
import styles from "./apply.module.css"

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
  return (
    <div className={background.page}>
      <div className={`${background.aura} ${styles.applicationAura}`}>
        <div className={styles.backdrop} aria-hidden="true">
          <ArcticBackdrop />
        </div>
        <div className={styles.content}>
          <a href="#application-content" className={styles.skipLink}>Skip to application form</a>
          <div className={styles.top}>
          <header className={styles.header}>
            <Link href="/" aria-label="SheCanCode application portal home" className={styles.homeLink}>
              <Image src="/logo.png" alt="SheCanCode" width={263} height={191} priority className={styles.logo} />
            </Link>
            <Link href="/" className={styles.backLink}>
              <ArrowLeft size={16} aria-hidden="true" />
              Back to Home
            </Link>
          </header>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>YOUR NEXT CHAPTER</p>
            <h1 id="application-title">Application Form</h1>
            <p>Your next chapter, in four simple steps.</p>
          </div>
          </div>
          <div className={styles.applicationLayout}>
            <aside id="application-step-navigation" className={styles.stepSidebar} aria-label="Application steps" />
            <main id="application-content" tabIndex={-1} className={styles.panel} aria-labelledby="application-title">
              <p className="mb-5 text-center text-sm text-slate-600">You arrived from <strong>{entry.sourceDomain}</strong></p>
              <ApplicationForm initialPrograms={initialPrograms} initialStep={initialStep} />
            </main>
          </div>
          <footer className={styles.footer}>© {new Date().getFullYear()} SheCanCode</footer>
        </div>
      </div>
    </div>
  )
}
