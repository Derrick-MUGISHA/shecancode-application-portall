import type { Metadata } from "next"
import AdminHeader from "@/components/admin/admin-header"
import BreadcrumbWithCustomSeparator, { BreadCrumLinkTypes } from "@/components/BreadcrumbWithCustomSeparator"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import styles from "@/components/admin/admin.module.css"
import { Toaster } from "@/components/ui/toaster"
import EmailsTable from "@/components/EmailsTable"
import { getCourses, getEmails } from "@/lib/actions"
import AdminProtectedRoute from "@/components/AdminProtectedRoute"

export const metadata: Metadata = {
  title: "Admin - Emails",
  description: "Manage emails",
}

const breadCrumLinks: BreadCrumLinkTypes[] = [
  { label: "Emails", link: "/admin/emails", position: "end" },
]

export default async function AdminEmailsPage() {
  const [emails, courses] = await Promise.all([getEmails(), getCourses()]);

  return (
    <AdminProtectedRoute>
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <BreadcrumbWithCustomSeparator breadCrumLinks={breadCrumLinks} />
      <main id="admin-main" tabIndex={-1} className="flex-1 w-full min-w-0 py-8 px-4">
        <div className={styles.workspace}>
          <header className={styles.heading}>
            <div><span className={styles.eyebrow}>Email management</span><h1>Emails</h1><p>Prepare the messages you use throughout admissions.</p></div>
            <Button asChild><Link href="/admin/emails/new"><Plus size={16} className="mr-2" aria-hidden="true"/>Add email</Link></Button>
          </header>
          <EmailsTable emails={emails} courses={courses ?? []} />
        </div>
        <Toaster />
      </main>
      </div>
      </AdminProtectedRoute>
  )
}