"use client"

import { BriefcaseBusiness, GraduationCap, Languages } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import type { formSchema } from "@/lib/form-schema"
import EducationAttachmentField from "@/components/education-attachment-field"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type FormValues = z.infer<typeof formSchema>
type Props = { form: UseFormReturn<FormValues> }

function SelectQuestion({ form, name, label, options }: Props & {
  name: "currentOccupation" | "educationBackground" | "englishProficiency" | "englishSkillConfidence"
  label: string
  options: [string, string][]
}) {
  return <FormField control={form.control} name={name} render={({ field }) => (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl><SelectTrigger aria-required="true" icon={name === "currentOccupation" ? BriefcaseBusiness : name === "educationBackground" ? GraduationCap : Languages}><SelectValue placeholder="Please select an option" /></SelectTrigger></FormControl>
        <SelectContent>{options.map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )} />
}

export default function EducationOccupation({ form }: Props) {
  const noFormalEducation = form.watch("educationBackground") === "NO_FORMAL_EDUCATION"
  return (
    <div className="space-y-8">
      <section aria-labelledby="occupation-heading" className="space-y-6">
        <div>
          <h2 id="occupation-heading" className="text-xl font-semibold text-gray-700">Current Occupation</h2>
          <p className="text-sm text-muted-foreground">Tell us what you are currently doing, separately from your completed education.</p>
        </div>
        <SelectQuestion form={form} name="currentOccupation" label="What are you currently doing?" options={[
          ["EMPLOYED", "Employed"],
          ["ATTENDING_UNIVERSITY_NOT_EMPLOYED", "Attending university, not employed"],
          ["EMPLOYED_ATTENDING_UNIVERSITY", "Employed and attending university"],
          ["ATTENDING_ADVANCED_TRAINING_AND_UNIVERSITY", "Attending advanced training and university"],
          ["NOT_EMPLOYED_NOT_IN_SCHOOL_NOT_IN_ANY_TRAINING", "Not employed, in school or in training"],
          ["INTERNSHIP", "Internship"],
        ]} />
        <FormField control={form.control} name="occupationDetails" render={({ field }) => (
          <FormItem>
            <FormLabel>Current Work, Studies or Activities</FormLabel>
            <FormControl><Textarea required {...field} value={field.value || ""} maxLength={2000}
              placeholder="Describe your role and employer, current studies and year, training, internship, job search or other activities."
              className="bg-white text-gray-700 min-h-[100px]" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </section>

      <section aria-labelledby="education-heading" className="space-y-6 border-t pt-8">
        <div>
          <h2 id="education-heading" className="text-xl font-semibold text-gray-700">Highest Completed Education</h2>
          <p className="text-sm text-muted-foreground">Select the highest qualification you have completed. Describe ongoing studies in the occupation section above.</p>
        </div>
        <SelectQuestion form={form} name="educationBackground" label="Highest Level of Education Completed" options={[
          ["NO_FORMAL_EDUCATION", "No formal education"],
          ["PRIMARY_SCHOOL", "Primary school"],
          ["HIGH_SCHOOL", "High school"],
          ["TECHNICAL_SCHOOL", "Technical / vocational school"],
          ["DIPLOMA", "Diploma"],
          ["BACHELORS", "Bachelor’s degree"],
          ["MASTERS", "Master’s degree"],
          ["PHD", "PhD"],
          ["OTHER", "Other completed qualification"],
        ]} />
        {!noFormalEducation && <FormField control={form.control} name="university" render={({ field }) => (
          <FormItem>
            <FormLabel>School / Institution</FormLabel>
            <FormControl><Input {...field} value={field.value || ""} placeholder="Name of the school or institution you attended" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />}
        <FormField control={form.control} name="academicBackground" render={({ field }) => (
          <FormItem>
            <FormLabel>Education Details</FormLabel>
            <FormControl><Textarea required {...field} value={field.value || ""}
              placeholder="Tell us your qualification, field of study and completion year. If you have no formal education, briefly describe your learning experience."
              className="bg-white text-gray-700" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <EducationAttachmentField form={form} optional={noFormalEducation} />
      </section>

      <section aria-labelledby="english-heading" className="space-y-6 border-t pt-8">
        <h2 id="english-heading" className="text-xl font-semibold text-gray-700">English Proficiency</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SelectQuestion form={form} name="englishProficiency" label="English Proficiency" options={[
            ["BEGINNER", "Beginner"], ["INTERMEDIATE", "Intermediate"], ["ADVANCED", "Advanced"], ["FLUENT", "Fluent"], ["NATIVE", "Native"],
          ]} />
          <SelectQuestion form={form} name="englishSkillConfidence" label="Which English skill are you most confident in?" options={[
            ["READING", "Reading"], ["WRITING", "Writing"], ["SPEAKING", "Speaking"], ["LISTENING", "Listening"],
          ]} />
        </div>
      </section>
    </div>
  )
}
