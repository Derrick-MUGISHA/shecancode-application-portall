"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2, Search } from "lucide-react"

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

export default function ApplicationList() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [courseFilter, setcourseFilter] = useState<string>("ALL")
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/applications")
        if (!response.ok) {
          throw new Error("Failed to fetch applications")
        }
        const data = await response.json()
        setApplications(data)

        // Extract unique courses for filtering
        const uniqueCourses = Array.from(new Set(data.map((app: Application) => app.course.id))).map((courseId) => {
          const app = data.find((a: Application) => a.course.id === courseId)
          return {
            id: courseId,
            name: app.course.name,
          }
        })
        setCourses(uniqueCourses)
      } catch (error) {
        console.error("Error fetching applications:", error)
        setError("Failed to load applications. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [])

  // Filter applications based on search term and filters
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "ALL" || app.status === statusFilter
    const matchesCourse = courseFilter === "ALL" || app.course.id === courseFilter

    return matchesSearch && matchesStatus && matchesCourse
  })

  const getStatusBadge = (status: string) => {
    const colorClass = statusColors[status] || "bg-gray-100 text-gray-700"

    return (
      <Badge className={colorClass} variant={'outline'}>
        {status.replace(/_/g, " ")}
      </Badge>
    )
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
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Applications</CardTitle>
        <CardDescription>Manage and review applicant submissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-8 bg-white placeholder:text-muted-foreground text-gray-700 border border-gray-300 "
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
              <Select value={courseFilter} onValueChange={setcourseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Courses</SelectItem>
                  {courses.map((course) => (
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
                        <Button size="sm">
                          View Details
                        </Button>
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
  )
}
