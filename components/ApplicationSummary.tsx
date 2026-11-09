"use client"

import type { ReactNode } from "react"
import styles from "./admin/admin.module.css"
import { useAdminPrivacy } from "./admin/privacy-context"
import type { AdminApplication } from "@/lib/admin-application-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ContactLink from "./contact-link"
import ProfileAvatar from "./admin/profile-avatar"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface ApplicationSummaryProps {
  application: AdminApplication
  actions?: ReactNode
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

export default function ApplicationSummary({ application, actions }: ApplicationSummaryProps) {
  const hidden = useAdminPrivacy()
  const fields: { label: string; value: ReactNode }[] = [
    { label: "Applicant", value: <span className="flex items-center gap-2"><ProfileAvatar id={application.id} size={28} /><span>{application.fullName}</span></span> },
    { label: "Program", value: application.course?.name || "Unknown" },
    { label: "Cohort", value: application.cohort ? `cohort-${application.cohort.number}` : application.cohortLabel || application.course?.cohortLabel || "Data not available" },
    { label: "Status", value: <Badge className={`${styles.summaryStatus} ${statusColors[application.status] || "bg-gray-100 text-gray-800"}`} variant="outline">{application.status.replace(/_/g, " ")}</Badge> },
    { label: "Applied", value: format(new Date(application.createdAt), "d MMM yyyy") },
    ...(application.interviewDate ? [{ label: "Interview", value: format(new Date(application.interviewDate), "d MMM yyyy") }] : []),
    ...(application.decisionDate ? [{ label: "Decision", value: format(new Date(application.decisionDate), "d MMM yyyy") }] : []),
    ...(application.technicalInterviewMarks != null ? [{ label: "Technical marks", value: `${application.technicalInterviewMarks}/100` }] : []),
    { label: "Entry website", value: application.entrySourceDomain || "Data not available" },
    { label: "Email", value: <ContactLink value={application.email} kind="email" /> },
    { label: "Phone", value: <ContactLink value={application.phone} kind="phone" /> },
  ]
  return (
    <Card className={styles.summaryCard}>
      <CardHeader className={styles.summaryHeader}>
        <CardTitle className="text-base">Application summary</CardTitle>
        <div className={styles.summaryActions}>{actions}</div>
      </CardHeader>
      <CardContent className={styles.summaryContent}>
        {hidden ? <p className="py-2 text-sm text-slate-500">Applicant details hidden on screen.</p> : (
          <dl className={styles.summaryFields}>
            {fields.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
