"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Course } from "@prisma/client"
import { useRouter } from "next/navigation"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useMemo } from "react"
import dynamic from "next/dynamic"
// const QuillEditor = dynamic(() => import("react-quill"), { ssr: false })
// import "react-quill/dist/quill.snow.css"
import RichTextEditor from "./RichTextEditor"
const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });
// const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
//   ssr: false,
//   loading: () => <p>Loading editor...</p>,
// })

const EmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  courseId: z.string().min(1, "Course is required"),
  invitationDate: z.string().optional(),
})

type EmailFormValues = z.infer<typeof EmailSchema>

interface EmailFormProps {
  courses: Course[]
  defaultValues?: Partial<EmailFormValues>
  onSubmit: (data: FormData) => Promise<{ success: boolean; message: string; errors?: any }>
  submitButtonText?: string
}

export default function EmailForm({
  courses,
  defaultValues = {},
  onSubmit,
  submitButtonText = "Submit",
}: EmailFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(EmailSchema),
    defaultValues: {
      subject: defaultValues.subject || "",
      body: defaultValues.body || "",
      courseId: defaultValues.courseId || "",
      invitationDate: defaultValues.invitationDate || "",
    },
  })

  const editorConfig = useMemo(
    () => ({
      readonly: false,
      placeholder: "Enter email body...",
      height: 400,
    }),
    []
  )

  const handleSubmit = async (values: EmailFormValues) => {
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (value) formData.append(key, value)
    })

    const result = await onSubmit(formData)

    toast({
      title: result.success ? "Success" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    })

    if (result.success) {
      router.push("/admin/emails")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="Enter email subject" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Body</FormLabel>
              <FormControl>
                <Controller
                  control={form.control}
                  name="body"
                  render={({ field: { onChange, value } }) => (
                    <RichTextEditor
                      value={value || ""}
                      onChange={onChange}
                      placeholder="Enter email body..."
                    />
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        /> */}
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Body</FormLabel>
              <FormControl>
                <Controller
                  control={form.control}
                  name="body"
                  render={({ field: { onChange, value } }) => (
                    <JoditEditor
                      value={value || ""}
                      config={editorConfig}
                      onBlur={(newContent) => onChange(newContent)}
                      onChange={() => {}}
                    />
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="courseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="invitationDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invitation Date (Optional)</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">{submitButtonText}</Button>
      </form>
    </Form>
  )
}