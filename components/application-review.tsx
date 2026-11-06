"use client"

import { Pencil } from "lucide-react"
import type { z } from "zod"
import type { formSchema } from "@/lib/form-schema"
import { formatPhoneNumber } from "@/lib/phone"
import styles from "./application-wizard.module.css"

type Values = z.infer<typeof formSchema>

export default function ApplicationReview({ values, programName, cohortLabel, onEdit }: {
  values: Values
  programName?: string
  cohortLabel?: string | null
  onEdit: (step: number) => void
}) {
  const show = (value: unknown): string => {
    if (typeof value === "boolean") return value ? "Yes" : "No"
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? "Data not available" : value.toLocaleDateString("en-GB")
    return typeof value === "string" && value ? value : "Data not available"
  }
  const readable = (value?: string | null) => value?.replace(/_/g, " ")
  const groups: { step: number; title: string; preview: string; rows: [string, unknown][] }[] = [
    { step: 0, title: "Your program", preview: programName || "Data not available", rows: [["Program", programName], ["Cohort", cohortLabel || "Data not available"]] },
    { step: 1, title: "About you", preview: [values.fullName, values.email].filter(Boolean).join(" · "), rows: [
      ["Full name", values.fullName], ["Email", values.email], ["Date of birth", values.dateOfBirth],
      ["Gender", readable(values.gender)], ["Phone", formatPhoneNumber(values.phone || "")], ["Nationality", values.nationality],
      ["Refugee status", values.refugeeStatus], [values.refugeeStatus ? "Refugee registration number" : "ID number", values.identificationNumber],
      ["Has a disability", values.hasDisability], ...(values.hasDisability ? [["Disability type", readable(values.disabilityType)], ["Disability details", values.disabilityDetails]] as [string, unknown][] : []),
      ["Province", values.province], ["District", values.district], ["Sector", values.sector], ["Cell", values.cell], ["Village", values.village],
      ["Emergency contact", values.emergencyContactName], ["Relationship", values.emergencyContactRelation], ["Emergency phone", formatPhoneNumber(values.emergencyContactPhone || "")],
    ] },
    { step: 2, title: "Education & background", preview: show(readable(values.educationBackground)), rows: [
      ["Current occupation", readable(values.currentOccupation)], ["Current activities", values.occupationDetails],
      ["Highest completed education", readable(values.educationBackground)], ["School / institution", values.university],
      ["Education details", values.academicBackground], ["Attachment", values.educationDocument ? `${values.educationDocument.name} (${(values.educationDocument.size / 1024).toFixed(0)} KB)` : undefined],
      ["English proficiency", readable(values.englishProficiency)], ["Strongest English skill", readable(values.englishSkillConfidence)],
      ["Has a young child", values.hasYoungChild], ...(values.hasYoungChild ? [["Has childcare support", values.hasChildcareSupport]] as [string, unknown][] : []),
      ["Has a laptop", values.hasLaptop],
    ] },
    { step: 3, title: "Motivation & additional information", preview: values.howDidYouKnow ? show(readable(values.howDidYouKnow)) : "Your final details", rows: [
      ["LinkedIn profile", values.linkedInProfile], ["GitHub profile", values.githubProfile],
      ["How you heard about us", readable(values.howDidYouKnow)], ["Referral details", values.howDidYouKnowSpecification],
      ["Motivation", values.motivation], ["Additional feedback", values.additionalFeedback],
    ] },
  ]

  return (
    <div className={styles.review}>
      <h3>Check your details</h3>
      <p>Review all your information below. You can edit any section before submitting.</p>
      {groups.map(group => (
        <details open key={group.title} className={styles.reviewGroup}>
          <summary><span>{group.title}</span><span>{group.preview}</span></summary>
          <dl>{group.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{show(value)}</dd></div>)}</dl>
          <button type="button" onClick={() => onEdit(group.step)} className={styles.editButton}><Pencil size={14} aria-hidden="true" />Edit {group.title.toLowerCase()}</button>
        </details>
      ))}
    </div>
  )
}
