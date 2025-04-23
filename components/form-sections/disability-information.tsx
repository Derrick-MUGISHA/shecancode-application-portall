"use client"

import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import type { formSchema } from "@/lib/form-schema"

import { Checkbox } from "@/components/ui/checkbox"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type FormValues = z.infer<typeof formSchema>

interface DisabilityInformationProps {
  form: UseFormReturn<FormValues>
}

export default function DisabilityInformation({ form }: DisabilityInformationProps) {
  // Watch form values for conditional fields
  const hasDisability = form.watch("hasDisability")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-700">Disability Information</h2>
        <p className="text-sm text-muted-foreground">Please provide information about any disabilities</p>
      </div>

      <FormField
        control={form.control}
        name="hasDisability"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-300 p-4">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel className="text-gray-700">I have a disability</FormLabel>
              <FormDescription>Check this box if you have any disability</FormDescription>
            </div>
          </FormItem>
        )}
      />

      {hasDisability && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
          <FormField
            control={form.control}
            name="disabilityType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disability Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select disability type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PHYSICAL_IMPAIRMENT">Physical impairment</SelectItem>
                    <SelectItem value="VISUAL_IMPAIRMENT">Visual impairment</SelectItem>
                    <SelectItem value="HEARING_IMPAIRMENT">Hearing impairment</SelectItem>
                    <SelectItem value="MENTAL_IMPAIRMENT">Mental impairment</SelectItem>
                    <SelectItem value="SHORT_STATURE">Short Stature/Little people</SelectItem>
                    <SelectItem value="ALBINISM">People with Albinism</SelectItem>
                    <SelectItem value="DEAF_BLIND">Deaf blind</SelectItem>
                    <SelectItem value="AUTISM">Autism</SelectItem>
                    <SelectItem value="MULTIPLE_DISABILITIES">Multiple disabilities</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="disabilityDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Disability Details</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Please provide details about your disability"
                    className="resize-none bg-white border border-gray-300 text-gray-700"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  )
}
