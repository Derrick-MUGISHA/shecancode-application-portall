"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const formSchema = z.object({
  status: z.enum(
    [
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
    ],
    {
      required_error: "Please select a status",
    },
  ),
  reviewerComments: z.string().optional(),
  interviewDate: z.date().optional().nullable(),
  decisionDate: z.date().optional().nullable(),
  technicalInterviewMarks: z.number().min(0).max(100).optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

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

export default function ApplicationDetails({ application }: { application: any }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: application.status,
      reviewerComments: application.reviewerComments || "",
      interviewDate: application.interviewDate ? new Date(application.interviewDate) : null,
      decisionDate: application.decisionDate ? new Date(application.decisionDate) : null,
      technicalInterviewMarks: application.technicalInterviewMarks || null,
    },
  })

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update application")
      }

      toast({
        title: "Application Updated",
        description: "The application has been successfully updated.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error updating application:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update application",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colorClass = statusColors[status] || "bg-gray-100 text-gray-800"

    return (
      <Badge className={colorClass} variant="outline">
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link
            href="/admin/applications"
            className="flex items-center text-sm text-muted-foreground hover:text-gray-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Applications
          </Link>
        </div>
        <div>{getStatusBadge(application.status)}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Applicant Details</TabsTrigger>
              <TabsTrigger value="review">Review & Decision</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
                      <p className="text-base">{application.fullName}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                      <p className="text-base">{application.email}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Date of Birth</h3>
                      <p className="text-base">{format(new Date(application.dateOfBirth), "PPP")}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Gender</h3>
                      <p className="text-base">{application.gender.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                      <p className="text-base">{application.phone}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Nationality</h3>
                      <p className="text-base">{application.nationality}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Refugee Status</h3>
                      <p className="text-base">{application.refugeeStatus ? "Yes" : "No"}</p>
                    </div>
                    {application.refugeeStatus && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Refugee ID</h3>
                        <p className="text-base">{application.refugeeId}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Disability Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Has Disability</h3>
                    <p className="text-base">{application.hasDisability ? "Yes" : "No"}</p>
                  </div>
                  {application.hasDisability && (
                    <>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Disability Type</h3>
                        <p className="text-base">{application.disabilityType?.replace(/_/g, " ")}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Disability Details</h3>
                        <p className="text-base">{application.disabilityDetails || "Not provided"}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Province</h3>
                    <p className="text-base">{application.province}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">District</h3>
                    <p className="text-base">{application.district}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Sector</h3>
                    <p className="text-base">{application.sector}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Cell</h3>
                    <p className="text-base">{application.cell}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Village</h3>
                    <p className="text-base">{application.village}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Emergency Contact</h3>
                      <p className="text-base">{application.emergencyContactName}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Relationship</h3>
                      <p className="text-base">{application.emergencyContactRelation}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Emergency Phone</h3>
                      <p className="text-base">{application.emergencyContactPhone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Family and Equipment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Has Young Child</h3>
                      <p className="text-base">{application.hasYoungChild ? "Yes" : "No"}</p>
                    </div>
                    {application.hasYoungChild && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Has Childcare Support</h3>
                        <p className="text-base">{application.hasChildcareSupport ? "Yes" : "No"}</p>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Has Laptop</h3>
                      <p className="text-base">{application.hasLaptop ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Education and Occupation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Current Occupation</h3>
                      <p className="text-base">{application.currentOccupation.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Education Background</h3>
                      <p className="text-base">{application.educationBackground.replace(/_/g, " ")}</p>
                    </div>
                    {application.university && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">University/Institution</h3>
                        <p className="text-base">{application.university}</p>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">English Proficiency</h3>
                      <p className="text-base">{application.englishProficiency}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Academic Background</h3>
                    <p className="text-base">{application.academicBackground}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Course and Motivation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Selected Course</h3>
                    <p className="text-base">{application.course.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">How They Heard About Us</h3>
                    <p className="text-base">{application.howDidYouKnow}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">How They Heard About Us</h3>
                    <p className="text-base">{application.howDidYouKnowSpecification}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Motivation</h3>
                    <p className="text-base whitespace-pre-line">{application.motivation}</p>
                  </div>
                  {application.additionalFeedback && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Additional Feedback</h3>
                      <p className="text-base whitespace-pre-line">{application.additionalFeedback}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Professional Profiles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {application.linkedInProfile && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">LinkedIn Profile</h3>
                        <a
                          href={application.linkedInProfile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {application.linkedInProfile}
                        </a>
                      </div>
                    )}
                    {application.githubProfile && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">GitHub Profile</h3>
                        <a
                          href={application.githubProfile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {application.githubProfile}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="review" className="space-y-6 pt-4">
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
                                <SelectItem value="COMMON_INTERVIEW_SCHEDULED">Common Interview Scheduled</SelectItem>
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
                                    variant={"date"}
                                    className="w-full pl-3 text-left font-normal bg-white text-gray-700 border border-gray-300"
                                    >
                                    {field.value ? format(field.value, "PPP") : <span className={`${!field.value ? "text-muted-foreground": ""}`}>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-white text-gray-700 border border-gray-300" align="start">
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
                                    variant={"date"}
                                    className="w-full pl-3 text-left font-normal bg-white text-gray-700 border border-gray-300"
                                  >
                                    {field.value ? format(field.value, "PPP") : <span className={`${!field.value ? "text-muted-foreground": ""}`}>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-white text-gray-700 border border-gray-300" align="start">
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
            </TabsContent>
          </Tabs>
        </div>

        <div>
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
        </div>
      </div>
    </div>
  )
}
