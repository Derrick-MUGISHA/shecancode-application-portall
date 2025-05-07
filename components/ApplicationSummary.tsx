"use client"

import { Application, Course } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface ApplicationSummaryProps {
  application: Application & { course: Course }
}

const statusColors: Record<string, string> = {
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  TECHNICAL_INTERVIEW_SCHEDULED: "bg-blue-100 text-blue-800",
  TECHNICAL_INTERVIEWED: "bg-indigo-100 text-indigo-800",
  COMMON_INTERVIEW_SCHEDULED: "bg-purple-100 text-purple-800",
  COMMON_INTERVIEWED: "bg-fuchsia-100 text-fuchsia-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  WAITLISTED: "bg-orange-100 text-orange-800",
  WITHDRAWN: "bg-gray-100 text-gray-800",
  NEEDS_FOLLOW_UP: "bg-pink-100 text-pink-800",
}

export default function ApplicationSummary({ application }: ApplicationSummaryProps) {
  const getStatusBadge = (status: string) => {
    const colorClass = statusColors[status] || "bg-gray-100 text-gray-800"
    return (
      <Badge className={colorClass} variant="outline">
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Applicant</h3>
          <p className="text-base font-medium">{application.fullName}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Course</h3>
          <p className="text-base">{application.course.name}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
          <div className="pt-1">{getStatusBadge(application.status)}</div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Date Applied</h3>
          <p className="text-base">{format(new Date(application.createdAt), "PPP")}</p>
        </div>
        {application.interviewDate && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Interview Date</h3>
            <p className="text-base">{format(new Date(application.interviewDate), "PPP")}</p>
          </div>
        )}
        {application.decisionDate && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Decision Date</h3>
            <p className="text-base">{format(new Date(application.decisionDate), "PPP")}</p>
          </div>
        )}
        {application.technicalInterviewMarks !== null && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Technical Interview Marks</h3>
            <p className="text-base">{application.technicalInterviewMarks}/100</p>
          </div>
        )}
        <Separator />
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
          <p className="text-base">{application.email}</p>
          <p className="text-base">{application.phone}</p>
        </div>
      </CardContent>
    </Card>
  )
}