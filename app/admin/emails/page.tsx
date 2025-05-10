import type { Metadata } from "next"
import AdminHeader from "@/components/admin/admin-header"
import BreadcrumbWithCustomSeparator, { BreadCrumLinkTypes } from "@/components/BreadcrumbWithCustomSeparator"
import Link from "next/link"
import prisma from "@/lib/prisma"
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
  const emails = await getEmails();
  const courses = await getCourses();

  return (
    <AdminProtectedRoute>
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <BreadcrumbWithCustomSeparator breadCrumLinks={breadCrumLinks} />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-700">Emails</h1>
            <Link className="underline text-black" href="/admin/emails/new">
              Add New Email
            </Link>
          </div>
          <p className="text-muted-foreground pt-2">Manage settings for emails to be sent</p>
        </div>
        <EmailsTable emails={emails} courses={courses} />
        <Toaster />
      </main>
      </div>
      </AdminProtectedRoute>
  )
}