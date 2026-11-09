import type {Metadata} from "next"
import Link from "next/link"
import ArcticBackdrop from "@/components/arctic-backdrop"
import styles from "../home.module.css"
// Keep native POST Origin headers intact while withholding the entry URL from other websites.
export const metadata:Metadata={title:"Start your application · SheCanCode",referrer:"same-origin",robots:{index:false,follow:false}}
export default function EntryLayout({children}:{children:React.ReactNode}){return <div className={styles.page}><div className={styles.aura}><ArcticBackdrop/><main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-12"><div className="w-full max-w-xl space-y-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10"><Link href="/" aria-label="SheCanCode home"><img src="/logo.png" alt="SheCanCode" width={95} height={69}/></Link>{children}</div></main></div></div>}
