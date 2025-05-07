"use client"

import { useEffect, useMemo } from "react"
import { Email } from "@prisma/client"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import JoditEditor from "jodit-react"
import { Controller } from "react-hook-form"
import { UseFormReturn } from "react-hook-form"

interface EmailSelectionProps {
  emails: Email[]
  form: UseFormReturn<any>
}

export default function EmailSelection({ emails, form }: EmailSelectionProps) {
  const selectedEmailId = form.watch("selectedEmailId")
  const modifyEmail = form.watch("modifyEmail")

  const editorConfig = useMemo(
    () => ({
      readonly: false,
      placeholder: "Enter email body...",
      height: 400,
    }),
    []
  )

  useEffect(() => {
    if (selectedEmailId && !modifyEmail) {
      const selectedEmail = emails.find((email) => email.id === selectedEmailId)
      if (selectedEmail) {
        form.setValue("modifiedEmail", {
          subject: selectedEmail.subject,
          body: selectedEmail.body,
        })
      }
    }
  }, [selectedEmailId, modifyEmail, emails, form])

  return (
    <div className="space-y-6 p-4 border rounded-md bg-gray-50">
      <FormField
        control={form.control}
        name="selectedEmailId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Select Email Template</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select an email template" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {emails.map((email) => (
                  <SelectItem key={email.id} value={email.id}>
                    {email.subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedEmailId && (
        <>
          <FormField
            control={form.control}
            name="modifiedEmail.subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Subject</FormLabel>
                <FormControl>
                  <Input placeholder="Enter email subject" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="modifiedEmail.body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Body</FormLabel>
                <FormControl>
                  <Controller
                    control={form.control}
                    name="modifiedEmail.body"
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
        </>
      )}
    </div>
  )
}