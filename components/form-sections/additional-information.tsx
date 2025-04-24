"use client"
import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import type { formSchema } from "@/lib/form-schema"

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type FormValues = z.infer<typeof formSchema>

interface AdditionalInformationProps {
  form: UseFormReturn<FormValues>
}

export default function AdditionalInformation({ form }: AdditionalInformationProps) {
  // Options that require specification
  const optionsRequiringSpecification = ["FRIENDS", "ALUMNI", "SCHOOL", "SOCIAL_MEDIA", "EVENT", "OTHER"]

  // Get the current value of howDidYouKnow
  const howDidYouKnow = form.watch("howDidYouKnow")

  // Determine if specification should be shown
  const showSpecification = optionsRequiringSpecification.includes(howDidYouKnow)

  // Get the appropriate label based on selection
  const getSpecificationLabel = () => {
    switch (howDidYouKnow) {
      case "FRIENDS":
        return "Friend's name"
      case "ALUMNI":
        return "Alumni name/cohort"
      case "SCHOOL":
        return "School name"
      case "SOCIAL_MEDIA":
        return "Which platform?"
      case "EVENT":
        return "Event name"
      case "OTHER":
        return "Please specify"
      default:
        return ""
    }
  }

  const specificationLabel = getSpecificationLabel()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-700">Additional Information</h2>
        <p className="text-sm text-muted-foreground">Please provide additional details about yourself</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="linkedInProfile"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">LinkedIn Profile (Optional)</FormLabel>
              <FormControl>
                <Input
                  className="bg-white text-gray-700 border border-gray-300"
                  placeholder="https://linkedin.com/in/username"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="githubProfile"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">GitHub Profile (Optional)</FormLabel>
              <FormControl>
                <Input
                  className="bg-white text-gray-700 border border-gray-300"
                  placeholder="https://github.com/username"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="howDidYouKnow"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">How did you hear about us?</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value)
                  // Clear the specification field when changing selection
                  form.setValue("howDidYouKnowSpecification", "")
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select how you heard about us" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                  <SelectItem value="FRIENDS">Friends</SelectItem>
                  <SelectItem value="ALUMNI">Alumni</SelectItem>
                  <SelectItem value="WEBSITE">Website</SelectItem>
                  <SelectItem value="SCHOOL">School</SelectItem>
                  <SelectItem value="NEWSPAPER">Newspaper</SelectItem>
                  <SelectItem value="RADIO">Radio</SelectItem>
                  <SelectItem value="TV">TV</SelectItem>
                  <SelectItem value="EVENT">Event</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Conditional specification field - only render when needed */}
        {showSpecification && (
          <FormField
            control={form.control}
            name="howDidYouKnowSpecification"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">{specificationLabel}</FormLabel>
                <FormControl>
                  <Input
                    className="bg-white text-gray-700 border border-gray-300"
                    placeholder={`Please specify ${specificationLabel.toLowerCase()}`}
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <FormField
        control={form.control}
        name="motivation"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="bg-white text-gray-700">Motivation</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Please describe your motivation for applying to this course"
                className="min-h-[120px] bg-white text-gray-700 border border-gray-300"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormDescription>
              Minimum 50 characters. Explain why you want to join this course and what you hope to achieve.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="additionalFeedback"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-700">Additional Feedback (Optional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Any additional information you'd like to share"
                className="resize-none bg-white text-gray-700 border border-gray-300"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
