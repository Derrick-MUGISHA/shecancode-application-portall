"use client"

import {useEffect, useMemo, useState} from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {Download, Loader2, Search} from "lucide-react"
import { fetchApplications, updateApplicationStatuses } from "@/lib/actions"
import {generateDownloadExcel} from "@/lib/utils";
import { useToast } from "@/hooks/use-toast"

type Application = {
  id: string
  fullName: string
  email: string
  status: string
  createdAt: string | Date
  course: {
    id: string
    name: string
  } | null
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

type ApplicationsResult =
  | { success: true; applications: Application[]; statistics: Statistics }
  | { success: false; message: string }

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

const applicationStatuses = [
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "TECHNICAL_INTERVIEW_SCHEDULED", label: "Technical Interview Scheduled" },
  { value: "TECHNICAL_INTERVIEWED", label: "Technical Interviewed" },
  { value: "COMMON_INTERVIEW_SCHEDULED", label: "Common Interview Scheduled" },
  { value: "COMMON_INTERVIEWED", label: "Common Interviewed" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WAITLISTED", label: "Waitlisted" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "NEEDS_FOLLOW_UP", label: "Needs Follow-up" },
]

export default function ApplicationList({
  initialData,
  initialFilters,
}: {
  initialData: ApplicationsResult
  initialFilters: {
    search: string
    status: string
    course: string
  }
}) {
  const [applications, setApplications] = useState<Application[]>(initialData.success ? initialData.applications : [])
  const [statistics, setStatistics] = useState<Statistics | null>(
    initialData.success ? initialData.statistics : null
  )
  const [loading, setLoading] = useState(false)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [error, setError] = useState<string | null>(initialData.success ? null : initialData.message)
  const [searchTerm, setSearchTerm] = useState(initialFilters.search)
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters.status)
  const [courseFilter, setCourseFilter] = useState<string>(initialFilters.course)
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState<string>(initialFilters.status === "ALL" ? "" : initialFilters.status)
  const { toast } = useToast()

  const listHref = useMemo(() => {
    const params = new URLSearchParams()
    if (searchTerm.trim()) params.set("search", searchTerm.trim())
    if (statusFilter !== "ALL") params.set("status", statusFilter)
    if (courseFilter !== "ALL") params.set("course", courseFilter)
    const query = params.toString()
    return query ? `/admin/applications?${query}` : "/admin/applications"
  }, [courseFilter, searchTerm, statusFilter])

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
    const matchesCourse = courseFilter === "ALL" || app.course?.id === courseFilter
    return matchesSearch && matchesStatus && matchesCourse
  })

  const filteredApplicationIds = useMemo(
    () => filteredApplications.map((application) => application.id),
    [filteredApplications]
  )
  const selectedVisibleCount = selectedApplicationIds.filter((id) => filteredApplicationIds.includes(id)).length
  const allVisibleSelected =
    filteredApplicationIds.length > 0 && selectedVisibleCount === filteredApplicationIds.length

  useEffect(() => {
    window.history.replaceState(null, "", listHref)
  }, [listHref])

  useEffect(() => {
    setSelectedApplicationIds((current) => current.filter((id) => applications.some((app) => app.id === id)))
  }, [applications])

  const toggleApplicationSelection = (applicationId: string, checked: boolean) => {
    setSelectedApplicationIds((current) =>
      checked ? Array.from(new Set([...current, applicationId])) : current.filter((id) => id !== applicationId)
    )
  }

  const toggleAllVisibleApplications = (checked: boolean) => {
    setSelectedApplicationIds((current) => {
      if (!checked) {
        return current.filter((id) => !filteredApplicationIds.includes(id))
      }
      return Array.from(new Set([...current, ...filteredApplicationIds]))
    })
  }

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

  const handleBulkStatusUpdate = async () => {
    if (selectedApplicationIds.length === 0 || !bulkStatus) return

    setIsBulkUpdating(true)
    const result = await updateApplicationStatuses(selectedApplicationIds, bulkStatus)

    toast({
      title: result.success ? "Success" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    })

    if (result.success) {
      setApplications((current) =>
        current.map((application) =>
          selectedApplicationIds.includes(application.id)
            ? { ...application, status: bulkStatus }
            : application
        )
      )
      setSelectedApplicationIds([])
      await handleRefresh()
    }

    setIsBulkUpdating(false)
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
          <div className="mb-6 flex flex-col gap-3 pt-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-8 bg-white placeholder:text-muted-foreground text-gray-700 border border-gray-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="w-full sm:w-[170px]">
                  <Select value={statusFilter} onValueChange={(value) => {
                    setStatusFilter(value)
                    if (value !== "ALL") setBulkStatus(value)
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      {applicationStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-[170px]">
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
                <div className="w-full sm:w-[200px]">
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {applicationStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleBulkStatusUpdate}
                  disabled={selectedApplicationIds.length === 0 || !bulkStatus || isBulkUpdating}
                >
                  {isBulkUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Selected"
                  )}
                </Button>
                <Button onClick={() => generateDownloadExcel(filteredApplications, statusFilter)}>
                  <Download />
                  <span>Export to Excel</span>
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedApplicationIds.length} selected
              {filteredApplications.length > 0 ? ` from ${filteredApplications.length} filtered applications` : ""}
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
                    <TableHead className="w-[48px]">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(checked) => toggleAllVisibleApplications(checked === true)}
                        aria-label="Select all filtered applications"
                      />
                    </TableHead>
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
                    <TableRow key={application.id} data-state={selectedApplicationIds.includes(application.id) && "selected"}>
                      <TableCell>
                        <Checkbox
                          checked={selectedApplicationIds.includes(application.id)}
                          onCheckedChange={(checked) => toggleApplicationSelection(application.id, checked === true)}
                          aria-label={`Select ${application.fullName}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{application.fullName}</TableCell>
                      <TableCell>{application.email}</TableCell>
                      <TableCell>{application.course?.name || "Unknown"}</TableCell>
                      <TableCell>{getStatusBadge(application.status)}</TableCell>
                      <TableCell>{format(new Date(application.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/applications/${application.id}?from=${encodeURIComponent(listHref)}`}>
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
