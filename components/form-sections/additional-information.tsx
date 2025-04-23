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
                <Input className="bg-white text-gray-700 border border-gray-300" placeholder="https://linkedin.com/in/username" {...field} />
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
                <Input className="bg-white text-gray-700 border border-gray-300" placeholder="https://github.com/username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="howDidYouKnow"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-700">How did you hear about us?</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
