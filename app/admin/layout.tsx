import type { ReactNode } from "react"
import AdminSessionBoundary from "@/components/admin/admin-session-boundary"
import styles from "@/components/admin/admin.module.css"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shell}><AdminSessionBoundary>{children}</AdminSessionBoundary></div>
}
