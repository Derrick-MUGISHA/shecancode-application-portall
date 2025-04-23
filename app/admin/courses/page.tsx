import type { Metadata } from "next"
import CourseList from "@/components/admin/course-list"
import AdminHeader from "@/components/admin/admin-header"

export const metadata: Metadata = {
  title: "Admin - Courses",
  description: "Manage courses",
}

export default function AdminCoursesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-700">Courses</h1>
          <p className="text-muted-foreground pt-2">Manage available courses for applications</p>
        </div>
        <CourseList />
      </main>
    </div>
  )
}
