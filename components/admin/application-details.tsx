"use client"

import { useEffect, useState } from "react"
import type { Email } from "@prisma/client"
import type { AdminApplication } from "@/lib/admin-application-types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import styles from "./admin.module.css"
import { applicationReturnHref } from "@/lib/admin-navigation"
import { ArrowLeft } from "lucide-react"
import ApplicantInfo from "../ApplicantInfo"
import ApplicationReviewForm from "../ApplicationReviewForm"
import ApplicationSummary from "../ApplicationSummary"

interface ApplicationDetailsProps {
  application: AdminApplication
  emails: Email[]
}

export default function ApplicationDetails({ application, emails }: ApplicationDetailsProps) {
  const [tab, setTab] = useState("details")
  const [backHref, setBackHref] = useState("/admin/applications")

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from")
    setBackHref(applicationReturnHref(from))
    setTab(new URLSearchParams(window.location.search).get("tab") === "review" ? "review" : "details")
  }, [])

  return (
    <div className={`${styles.detailScope} space-y-6`}>
      <div className="flex items-center justify-between">
        {/* <Link
          href={backHref}
          className="flex items-center text-sm text-muted-foreground hover:text-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Link> */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs value={tab} onValueChange={value=>{
            setTab(value)
            const url=new URL(window.location.href)
            if(value==="review")url.searchParams.set("tab","review");else url.searchParams.delete("tab")
            window.history.replaceState(null,"",url.pathname+url.search)
          }}>
            <TabsList className="grid w-full grid-cols-2 gap-1 bg-muted">
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
        <div className={styles.summary}>
          <ApplicationSummary application={application} />
        </div>
      </div>
    </div>
  )
}
