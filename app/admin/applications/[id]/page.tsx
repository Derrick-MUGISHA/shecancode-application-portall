import type { Metadata } from "next"
import { notFound } from "next/navigation"
import ApplicationDetails from "@/components/admin/application-details"
import AdminHeader from "@/components/admin/admin-header"
import prisma from "@/lib/prisma"
import { getEmails } from "@/lib/actions"
import BreadcrumbWithCustomSeparator, { BreadCrumLinkTypes } from "@/components/BreadcrumbWithCustomSeparator"

export const metadata: Metadata = {
  title: "Application Details",
  description: "View and manage application details",
}

const breadCrumLinks: BreadCrumLinkTypes[] = [
  { label: 'Applications', link: '/admin/applications', position: 'middle' },
  { label: 'Details', link: '', position: 'end' },
];

export default async function ApplicationDetailsPage({ params }: { params: { id: string }}) {
  const { id } = await params;
  const emails = await getEmails();

  try {
    const application = await prisma.application.findUnique({
      where: {
        id,
      },
      include: {
        course: true,
      },
    })

    if (!application) {
      notFound()
    }

    return (
      <div className="min-h-screen flex flex-col">
        <AdminHeader />
        <BreadcrumbWithCustomSeparator breadCrumLinks={breadCrumLinks} />
        <main className="flex-1 container mx-auto py-8 px-4">
          <ApplicationDetails application={application} emails={emails}/>
        </main>
      </div>
    )
  } catch (error) {
    console.error("Error fetching application:", error)
    notFound()
  }
}
