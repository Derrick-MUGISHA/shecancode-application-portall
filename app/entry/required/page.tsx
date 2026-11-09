import Link from "next/link"
import { ArrowRight, Code2 } from "lucide-react"
import { isLocalDevelopmentPortal } from "@/lib/entry-token"
import EntryWebsiteLinks from "@/components/entry-website-links"
import styles from "../entry.module.css"

const steps = [
  { title: "Find your program", detail: "Explore either website and choose your course." },
  { title: "Select Apply", detail: "Use the Apply button on your program’s page." },
  { title: "Complete your form", detail: "You’ll return here to fill in your application." },
]

export default async function EntryRequired({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return <>
    <div className={styles.heading}>
      {/* <p className={styles.eyebrow}><span aria-hidden="true" />Your next chapter</p> */}
      <h1>{error ? <>Open a new<br /><span>application link.</span></> : <>Your application<br /><span>starts here.</span></>}</h1>
      <p className={styles.description}>
        {error ? <>This link is no longer available. Visit <strong>SheCanCode</strong> or <strong>Igire Rwanda</strong> and select <strong>Apply</strong> on your program’s page to continue.</>
          : <>Find your program on <strong>SheCanCode</strong> or <strong>Igire Rwanda</strong>.<br className={styles.desktopBreak} /> Select <strong>Apply</strong> on its website, and your form opens here automatically.</>}
      </p>
    </div>
    <EntryWebsiteLinks />
    <ol className={styles.steps} aria-label="How to start your application">
      {steps.map((step, index) => <li key={step.title}>
        <span className={styles.stepNumber} aria-hidden="true">0{index + 1}</span>
        <div><h2>{step.title}</h2><p>{step.detail}</p></div>
      </li>)}
    </ol>
    {isLocalDevelopmentPortal() && <div className={styles.localEntry}><Link href="/entry/development" className={styles.localLink}>
      <Code2 size={14} aria-hidden="true" />Open local application<ArrowRight size={13} aria-hidden="true" />
    </Link></div>}
  </>
}
