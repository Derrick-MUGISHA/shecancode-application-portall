"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Users, BookOpen, Mail, ArrowUpRight, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { adminSectionActive } from "@/lib/admin-navigation"
import { auth } from "@/lib/firebase"
import styles from "./admin.module.css"

const navLinks = [
  { href: "/admin/applications", label: "Applications", icon: Users },
  { href: "/admin/courses", label: "Programs & cohorts", icon: BookOpen },
  { href: "/admin/emails", label: "Emails", icon: Mail },
]

export default function AdminHeader() {
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState("")

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    setLogoutError("")
    try {
      await auth.signOut()
      queryClient.removeQueries({queryKey:["admin"]})
      document.cookie = "adminSession=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
      router.push("/admin/login")
    } catch {
      setLogoutError("Unable to sign out. Please try again.")
      setLoggingOut(false)
    }
  }

  return (
    <header className={styles.navHeader}>
      <a href="#admin-main" className={styles.skipLink}>Skip to content</a>
      <div className={styles.navInner}>
        <Link href="/admin/applications" className={styles.brand} aria-label="SheCanCode admissions workspace">
          <img src="/logo.png" alt="SheCanCode" width={76} height={55}/>
          <span>Admissions<small>SheCanCode workspace</small></span>
        </Link>
        <nav aria-label="Admin navigation">
          <ul className={styles.navLinks}>
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = adminSectionActive(pathname, href)
              return <li key={href}><Link href={href} prefetch={false} aria-current={active ? "page" : undefined} className={`${styles.navLink} ${active ? styles.navActive : ""}`}><Icon size={16} aria-hidden="true"/>{label}</Link></li>
            })}
          </ul>
        </nav>
        <div className={styles.navActions}>
          <Link href="/" className={styles.portalLink}>Application portal<ArrowUpRight size={14} aria-hidden="true"/></Link>
          <Button type="button" variant="outline" disabled={loggingOut} onClick={handleLogout}>
            {loggingOut ? <Loader2 size={15} className="animate-spin" aria-hidden="true"/> : <LogOut size={15} aria-hidden="true"/>}
            {loggingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
        {logoutError && <p role="alert" className="w-full text-sm text-red-700">{logoutError}</p>}
      </div>
    </header>
  )
}
