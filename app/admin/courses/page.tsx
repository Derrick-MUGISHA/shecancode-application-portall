import { getAllPreloadedPrograms } from "@/lib/program-data"
import type { Metadata } from "next"
import CourseList from "@/components/admin/course-list"
import AdminHeader from "@/components/admin/admin-header"
import AdminProtectedRoute from "@/components/AdminProtectedRoute"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Admin - Courses",
  description: "Manage courses",
}

export default async function AdminCoursesPage() {
  const programs = await getAllPreloadedPrograms().catch(() => undefined)
  return (
    <AdminProtectedRoute>
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <main className="flex-1 container mx-auto py-8 px-4">
        <CourseList initialPrograms={programs} />
      </main>
      </div>
      </AdminProtectedRoute>
  )
}
