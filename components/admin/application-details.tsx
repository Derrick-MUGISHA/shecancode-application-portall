"use client"

import { Application, Course, Email } from "@prisma/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import ApplicantInfo from "../ApplicantInfo"
import ApplicationReviewForm from "../ApplicationReviewForm"
import ApplicationSummary from "../ApplicationSummary"

interface ApplicationDetailsProps {
  application: Application & { course: Course }
  emails: Email[]
}

export default function ApplicationDetails({ application, emails }: ApplicationDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/applications"
          className="flex items-center text-sm text-muted-foreground hover:text-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Applicant Details</TabsTrigger>
              <TabsTrigger value="review">Review & Decision</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-6 pt-4">
              <ApplicantInfo application={application} />
            </TabsContent>
            <TabsContent value="review" className="space-y-6 pt-4">
              <ApplicationReviewForm application={application} emails={emails} />
            </TabsContent>
          </Tabs>
        </div>
        <div>
          <ApplicationSummary application={application} />
        </div>
      </div>
    </div>
  )
}