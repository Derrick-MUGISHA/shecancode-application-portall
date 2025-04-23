import type { Metadata } from "next"
import ApplicationForm from "@/components/application-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Apply - Applicant Registration System",
  description: "Submit your application for our courses",
}

export default async function ApplyPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-700">Application Form</h1>
          <p className="mt-2 text-muted-foreground">Please fill out the form below to apply for our courses</p>
        </div>
        <ApplicationForm />
      </div>
    </div>
  )
}
