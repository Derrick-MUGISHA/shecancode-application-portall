"use client"

import { useState } from "react"
import { ArrowUpRight } from "lucide-react"
import styles from "@/app/entry/entry.module.css"

const websites = [
  { name: "SheCanCode", url: "https://www.shecancodeschool.org/", logo: "https://www.shecancodeschool.org/images/scclogo.webp", initials: "SCC", caption: "Explore coding programs" },
  { name: "Igire Rwanda", url: "https://www.igirerwanda.org/", logo: "https://www.igirerwanda.org/images/logo-igire.png", initials: "IR", caption: "Discover your next program" },
]

export default function EntryWebsiteLinks() {
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  return <nav className={styles.websites} aria-label="Application websites">
    {websites.map(website => <a key={website.name} className={styles.websiteChoice} href={website.url}>
      <span className={styles.brandIcon} aria-hidden="true">
        {failed[website.name] ? <span className={styles.brandFallback}>{website.initials}</span> : <img src={website.logo} alt="" width={58} height={58}
          referrerPolicy="no-referrer" onError={() => setFailed(current => ({ ...current, [website.name]: true }))} />}
      </span>
      <span className={styles.websiteCopy}><strong>{website.name}</strong><small>{website.caption}</small></span>
      <ArrowUpRight className={styles.websiteArrow} size={18} aria-hidden="true" />
    </a>)}
  </nav>
}
