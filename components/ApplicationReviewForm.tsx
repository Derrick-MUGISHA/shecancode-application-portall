"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Application, Email } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { CalendarIcon, Loader2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { updateApplication } from "@/lib/actions"
import EmailSelection from "./EmailSelection"

const formSchema = z.object({
  status: z.enum([
    "UNDER_REVIEW",
    "TECHNICAL_INTERVIEW_SCHEDULED",
    "TECHNICAL_INTERVIEWED",
    "COMMON_INTERVIEW_SCHEDULED",
    "COMMON_INTERVIEWED",
    "ACCEPTED",
    "REJECTED",
    "WAITLISTED",
    "WITHDRAWN",
    "NEEDS_FOLLOW_UP",
  ]),
  reviewerComments: z.string().optional(),
  interviewDate: z.date().optional().nullable(),
  decisionDate: z.date().optional().nullable(),
  technicalInterviewMarks: z.number().min(0).max(100).optional().nullable(),
  sendEmail: z.boolean().optional(),
  selectedEmailId: z.string().optional(),
  modifiedEmail: z
    .object({
      subject: z.string().min(1, "Subject is required").optional(),
      body: z.string().min(1, "Body is required").optional(),
    })
    .optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ApplicationReviewFormProps {
  application: Application
  emails: Email[]
}

export default function ApplicationReviewForm({ application, emails }: ApplicationReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: application.status,
      reviewerComments: application.reviewerComments || "",
      interviewDate: application.interviewDate ? new Date(application.interviewDate) : null,
      decisionDate: application.decisionDate ? new Date(application.decisionDate) : null,
      technicalInterviewMarks: application.technicalInterviewMarks || null,
      sendEmail: false,
      selectedEmailId: "",
      modifiedEmail: undefined,
    },
  })

  const sendEmail = form.watch("sendEmail")

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true)
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (key === "interviewDate" || key === "decisionDate") {
        if (value instanceof Date) {
          formData.append(key, value.toISOString())
        }
      } else if (key === "modifiedEmail" && value) {
        if (value.subject) formData.append("modifiedEmail.subject", value.subject)
        if (value.body) formData.append("modifiedEmail.body", value.body)
      } else if (value !== undefined && value !== null) {
        formData.append(key, value.toString())
      }
    })

    const result = await updateApplication(application.id, formData)

    toast({
      title: result.success ? "Success" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    })

    if (result.success) {
      router.refresh()
    }
    setIsSubmitting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Review</CardTitle>
        <CardDescription>Update the application status and provide feedback</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                      <SelectItem value="TECHNICAL_INTERVIEW_SCHEDULED">
                        Technical Interview Scheduled
                      </SelectItem>
                      <SelectItem value="TECHNICAL_INTERVIEWED">Technical Interviewed</SelectItem>
                      <SelectItem value="COMMON_INTERVIEW_SCHEDULED">
                        Common Interview Scheduled
                      </SelectItem>
                      <SelectItem value="COMMON_INTERVIEWED">Common Interviewed</SelectItem>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="WAITLISTED">Waitlisted</SelectItem>
                      <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                      <SelectItem value="NEEDS_FOLLOW_UP">Needs Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interviewDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Interview Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="date"
                          className="w-full pl-3 text-left font-normal bg-white text-gray-700 border border-gray-300"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span className="text-muted-foreground">Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 bg-white text-gray-700 border border-gray-300"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Set the date for the interview (if applicable)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="decisionDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Decision Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="date"
                          className="w-full pl-3 text-left font-normal bg-white text-gray-700 border border-gray-300"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span className="text-muted-foreground">Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 bg-white text-gray-700 border border-gray-300"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Set the date when the final decision was made</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="technicalInterviewMarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technical Interview Marks</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0-100"
                      value={field.value === null ? "" : field.value}
                      className="border border-gray-300 placeholder:text-muted-foreground text-gray-700"
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : Number.parseFloat(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormDescription>Enter marks from the technical interview (if applicable)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reviewerComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reviewer Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add your comments about this application"
                      className="min-h-[120px] bg-white border border-gray-300 placeholder:text-muted-foreground text-gray-700"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>These comments are only visible to administrators</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sendEmail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Send email to applicant</FormLabel>
                    <FormDescription>
                      Notify the applicant about the status update via email
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {sendEmail && <EmailSelection emails={emails} form={form} />}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Application"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}