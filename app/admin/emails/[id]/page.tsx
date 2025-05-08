import type { Metadata } from "next"
import { notFound } from "next/navigation"
import AdminHeader from "@/components/admin/admin-header"
import prisma from "@/lib/prisma"
import { Toaster } from "@/components/ui/toaster"
import EmailDetails from "@/components/EmailDetails"
import BreadcrumbWithCustomSeparator, { BreadCrumLinkTypes } from "@/components/BreadcrumbWithCustomSeparator"

export const metadata: Metadata = {
  title: "Email Details",
  description: "View and manage email details",
}

async function getEmail(id: string) {
  return prisma.email.findUnique({
    where: { id },
    include: { course: true },
  })
}

async function getCourses() {
  return prisma.course.findMany()
}

const breadCrumLinks: BreadCrumLinkTypes[] = [
  { label: 'Emails', link: '/admin/emails', position: 'middle' },
  { label: 'Details', link: '', position: 'end' },
];

export default async function EmailDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params

  try {
    const email = await getEmail(id)
    const courses = await getCourses()

    if (!email) {
      notFound()
    }

    return (
      <div className="min-h-screen flex flex-col">
        <AdminHeader />
        <BreadcrumbWithCustomSeparator breadCrumLinks={breadCrumLinks} />
        <main className="flex-1 container mx-auto py-8 px-4">
          <EmailDetails email={email} courses={courses} />
          <Toaster />
        </main>
      </div>
    )
  } catch (error) {
    console.error("Error fetching email:", error)
    notFound()
  }
}