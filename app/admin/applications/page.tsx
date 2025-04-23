import type { Metadata } from "next"
import ApplicationList from "@/components/admin/application-list"
import AdminHeader from "@/components/admin/admin-header"

export const metadata: Metadata = {
  title: "Admin - Applications",
  description: "Manage applicant applications",
}

export default function AdminApplicationsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-700">Applications</h1>
          <p className="text-muted-foreground pt-2">View and manage all applicant applications</p>
        </div>
        <ApplicationList />
      </main>
    </div>
  )
}
