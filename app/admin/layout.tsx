import type { ReactNode } from "react"
import styles from "@/components/admin/admin.module.css"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>{children}</div>
}
