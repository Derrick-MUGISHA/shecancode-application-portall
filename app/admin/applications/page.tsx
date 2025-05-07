import type { Metadata } from "next"
import ApplicationList from "@/components/admin/application-list"
import AdminHeader from "@/components/admin/admin-header"
import { fetchApplications } from "@/lib/actions"
import BreadcrumbWithCustomSeparator, { BreadCrumLinkTypes } from "@/components/BreadcrumbWithCustomSeparator"

export const metadata: Metadata = {
  title: "Admin - Applications",
  description: "Manage applicant applications",
}

const breadCrumLinks: BreadCrumLinkTypes[] = [
  { label: "Applications", link: "/admin/applications", position: "end" },
]

export default async function AdminApplicationsPage() {
  const initialData = await fetchApplications();

  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <BreadcrumbWithCustomSeparator breadCrumLinks={breadCrumLinks} />
      <main className="flex-1 container mx-auto py-8 px-4">
        {/* <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-700">Applications</h1>
          <p className="text-muted-foreground pt-2">View and manage all applicant applications</p>
        </div> */}
        <ApplicationList initialData={initialData} />
      </main>
    </div>
  )
}
