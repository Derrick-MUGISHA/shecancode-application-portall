"use client"

import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import type { formSchema } from "@/lib/form-schema"

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type FormValues = z.infer<typeof formSchema>

interface EducationOccupationProps {
  form: UseFormReturn<FormValues>
}

export default function EducationOccupation({ form }: EducationOccupationProps) {
  // Watch form values for conditional fields
  const educationBackground = form.watch("educationBackground")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-700">Education and Occupation</h2>
        <p className="text-sm text-muted-foreground">Information about your education and current occupation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="currentOccupation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Occupation</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your occupation" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="EMPLOYED">Employed</SelectItem>
                  <SelectItem value="ATTENDING_UNIVERSITY_NOT_EMPLOYED">Attending University Not Employed</SelectItem>
                  <SelectItem value="EMPLOYED_ATTENDING_UNIVERSITY">Employed and Attending University</SelectItem>
                  <SelectItem value="ATTENDING_ADVANCED_TRAINING_AND_UNIVERSITY">Attending advanced training and university</SelectItem>
                  <SelectItem value="NOT_EMPLOYED_NOT_IN_SCHOOL_NOT_IN_ANY_TRAINING">Not employed, not in school, not in any training</SelectItem>
                  <SelectItem value="INTERNSHIP">Internship</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="educationBackground"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Education Background</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your education level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
                  <SelectItem value="TECHNICAL_SCHOOL">Technical School</SelectItem>
                  <SelectItem value="YEAR_1_UNIVERSITY">Year 1 University</SelectItem>
                  <SelectItem value="YEAR_2_UNIVERSITY">Year 2 University</SelectItem>
                  <SelectItem value="YEAR_3_UNIVERSITY">Year 3 University</SelectItem>
                  <SelectItem value="YEAR_4_UNIVERSITY">Year 4 University</SelectItem>
                  <SelectItem value="FINAL_YEAR_UNIVERSITY">Final Year University</SelectItem>
                  <SelectItem value="BACHELORS">Bachelor's Degree</SelectItem>
                  <SelectItem value="MASTERS">Master's Degree</SelectItem>
                  <SelectItem value="PHD">PhD</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {educationBackground &&
          [
            "YEAR_1_UNIVERSITY",
            "YEAR_2_UNIVERSITY",
            "YEAR_3_UNIVERSITY",
            "YEAR_4_UNIVERSITY",
            "FINAL_YEAR_UNIVERSITY",
            "BACHELORS",
            "MASTERS",
            "PHD",
          ].includes(educationBackground) && (
            <FormField
              control={form.control}
              name="university"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">University/Institution</FormLabel>
                  <FormControl>
                    <Input className="bg-white text-gray-700 border border-gray-300" placeholder="Name of your university/institution" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

        <FormField
          control={form.control}
          name="academicBackground"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Academic Background</FormLabel>
              <FormControl>
                <Textarea placeholder="Briefly describe your academic background" className="resize-none bg-white text-gray-700 border border-gray-300" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="englishProficiency"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">English Proficiency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your English level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="BEGINNER">Beginner</SelectItem>
                  <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                  <SelectItem value="ADVANCED">Advanced</SelectItem>
                  <SelectItem value="FLUENT">Fluent</SelectItem>
                  <SelectItem value="NATIVE">Native</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
