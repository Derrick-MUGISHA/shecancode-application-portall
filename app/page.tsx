import { cookies } from "next/headers";
import { ENTRY_COOKIE } from "@/lib/entry-token";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import styles from "./home.module.css";
import ArcticBackdrop from "@/components/arctic-backdrop";

export default async function Home() {
  // The application page still verifies this session. A new visitor goes straight
  // to the program websites instead of following /apply only to be redirected.
  const hasEntry = Boolean((await cookies()).get(ENTRY_COOKIE)?.value);
  const applicationHref = hasEntry ? "/apply" : "/entry/required";
  return (
    <div className={styles.page}>
      <div className={styles.aura}>
        <ArcticBackdrop />
        <div className={styles.content}>
          <header className={styles.header}>
            <Link href="https://www.shecancodeschool.org/" className={styles.logoLink} aria-label="SheCanCode school website">
              <Image src="/logo.png" alt="SheCanCode" width={263} height={191} priority className={styles.logo} />
            </Link>
            <a href="https://www.shecancodeschool.org/" className={styles.schoolLink}>
              Get to know us <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </header>
          <main id="main-content" className={styles.hero}>
            {/* <div className={styles.eyebrow}>
              <Sparkles size={15} strokeWidth={1.6} aria-hidden="true" />
              WELCOME TO SHECANCODE
            </div> */}
            <h1 className={styles.title}>
             Welcome to Our Application Portal
              <span>starts here.</span>
            </h1>
            <p className={styles.description}>
              Apply for our courses and programs to advance your career and skills.
              {/* <span>We can’t wait to meet you.</span> */}
            </p>
            <div className={styles.actions}>
              <Link href={applicationHref} prefetch={true} className={styles.applyLink}>
                {hasEntry ? "Continue your application" : "Explore programs"}
                <span className={styles.buttonIcon}>
                  <ArrowRight size={19} aria-hidden="true" />
                </span>
              </Link>
              <p className={styles.actionNote}>Your future is full of possibility.</p>
            </div>
            {/* <div className={styles.values} aria-label="Your journey with SheCanCode">
              <span>Learn with purpose</span>
              <span className={styles.valueDot} aria-hidden="true" />
              <span>Build with confidence</span>
              <span className={styles.valueDot} aria-hidden="true" />
              <span>Grow together</span>
            </div> */}
          </main>
          <footer className={styles.footer}>
            <span>© {new Date().getFullYear()} SheCanCode</span>
            <span>A little courage. A world of possibility.</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
