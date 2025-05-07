"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2, Search } from "lucide-react"
import { fetchApplications } from "@/lib/actions"

type Application = {
  id: string
  fullName: string
  email: string
  status: string
  createdAt: string
  course: {
    id: string
    name: string
  }
}

type Course = {
  id: string
  name: string
}

type Statistics = {
  totalApplicants: number
  applicantsByStatus: Record<string, number>
  applicantsByCourse: Record<string, number>
  applicantsByStatusAndCourse: Record<string, number>
  courses: Course[]
}

const statusColors: Record<string, string> = {
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 py-2 shadow-md border border-gray-200",
  TECHNICAL_INTERVIEW_SCHEDULED: "bg-blue-100 text-blue-800 hover:bg-blue-200 py-2 shadow-md border border-gray-200",
  TECHNICAL_INTERVIEWED: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 py-2 shadow-md border border-gray-200",
  COMMON_INTERVIEW_SCHEDULED: "bg-purple-100 text-purple-800 hover:bg-purple-200 py-2 shadow-md border border-gray-200",
  COMMON_INTERVIEWED: "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200 py-2 shadow-md border border-gray-200",
  ACCEPTED: "bg-green-100 text-green-800 hover:bg-green-200 py-2 shadow-md border border-gray-200",
  REJECTED: "bg-red-100 text-red-800 hover:bg-red-200 py-2 shadow-md border border-gray-200",
  WAITLISTED: "bg-orange-100 text-orange-800 hover:bg-orange-200 py-2 shadow-md border border-gray-200",
  WITHDRAWN: "bg-gray-100 text-gray-800 hover:bg-gray-200 py-2 shadow-md border border-gray-200",
  NEEDS_FOLLOW_UP: "bg-pink-100 text-pink-800 hover:bg-pink-200 py-2 shadow-md border border-gray-200",
}

export default function ApplicationList({
  initialData,
}: {
  initialData: { applications: Application[]; statistics: Statistics } | { success: false; message: string }
}) {
  const [applications, setApplications] = useState<Application[]>(initialData.success ? initialData.applications : [])
  const [statistics, setStatistics] = useState<Statistics | null>(
    initialData.success ? initialData.statistics : null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialData.success ? null : initialData.message)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [courseFilter, setCourseFilter] = useState<string>("ALL")

  const getStatusBadge = (status: string) => {
    const colorClass = statusColors[status] || "bg-gray-100 text-gray-700"
    return (
      <Badge className={colorClass} variant="outline">
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  // Filter applications based on search term and filters
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || app.status === statusFilter
    const matchesCourse = courseFilter === "ALL" || app.course.id === courseFilter
    return matchesSearch && matchesStatus && matchesCourse
  })

  // Refresh data on demand
  const handleRefresh = async () => {
    setLoading(true)
    const result = await fetchApplications()
    if (result.success) {
      setApplications(result.applications)
      setStatistics(result.statistics)
      setError(null)
    } else {
      setError(result.message)
    }
    setLoading(false)
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load applications</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button onClick={handleRefresh} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Section */}
      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle>Application Statistics</CardTitle>
            <CardDescription>Overview of applicant data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Applicants</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{statistics.totalApplicants}</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Applicants by Status */}
              <div>
                <h3 className="text-lg font-medium">Applicants by Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                  {Object.entries(statistics.applicantsByStatus).map(([status, count]) => (
                    <Card key={status}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <span>{status.replace(/_/g, " ")}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Applicants by Course */}
              <div>
                <h3 className="text-lg font-medium">Applicants by Course</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                  {Object.entries(statistics.applicantsByCourse).map(([course, count]) => (
                    <Card key={course}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <span>{course}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Applicants by Status and Course */}
              <div>
                <h3 className="text-lg font-medium">Applicants by Status and Course</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status / Course</TableHead>
                        {statistics.courses.map((course) => (
                          <TableHead key={course.id}>{course.name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.keys(statistics.applicantsByStatus).map((status) => (
                        <TableRow key={status}>
                          <TableCell>{status.replace(/_/g, " ")}</TableCell>
                          {statistics.courses.map((course) => (
                            <TableCell key={course.id}>
                              {statistics.applicantsByStatusAndCourse[`${status}__${course.name}`] || 0}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application List */}
      <Card>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-8 bg-white placeholder:text-muted-foreground text-gray-700 border border-gray-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="w-[180px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="TECHNICAL_INTERVIEW_SCHEDULED">Technical Interview Scheduled</SelectItem>
                    <SelectItem value="TECHNICAL_INTERVIEWED">Technical Interviewed</SelectItem>
                    <SelectItem value="COMMON_INTERVIEW_SCHEDULED">Common Interview Scheduled</SelectItem>
                    <SelectItem value="COMMON_INTERVIEWED">Common Interviewed</SelectItem>
                    <SelectItem value="ACCEPTED">Accepted</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="WAITLISTED">Waitlisted</SelectItem>
                    <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                    <SelectItem value="NEEDS_FOLLOW_UP">Needs Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[180px]">
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Courses</SelectItem>
                    {statistics?.courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No applications found.</div>
          ) : (
            <div className="rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">{application.fullName}</TableCell>
                      <TableCell>{application.email}</TableCell>
                      <TableCell>{application.course.name}</TableCell>
                      <TableCell>{getStatusBadge(application.status)}</TableCell>
                      <TableCell>{format(new Date(application.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/applications/${application.id}`}>
                          <Button size="sm">View Details</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}