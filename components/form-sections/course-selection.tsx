"use client"
import { useState, useEffect } from "react"
import { acceptingApplications, programClock } from "@/lib/program-availability"
import { Check, ArrowUpRight, BookOpen, Loader2 } from "lucide-react"
import { FormField, FormItem, FormMessage } from "@/components/ui/form"
import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import type { formSchema } from "@/lib/form-schema"
import styles from "../application-wizard.module.css"
export type { Program as Course } from "@/lib/program-types"
import type { Program as Course } from "@/lib/program-types"
type FormValues=z.infer<typeof formSchema>

export default function CourseSelection({form,courses,loading,error,onRetry}:{form:UseFormReturn<FormValues>;courses:Course[];loading:boolean;error:string|null;onRetry:()=>void}) {
  const [now,setNow]=useState(Date.now())
  const selectedId=form.watch("courseId"),cohortId=form.watch("cohortId")
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[])
  if(loading)return <div role="status" className={styles.emptyState}><Loader2 className="animate-spin" aria-hidden="true"/>Finding open programs…</div>
  if(error)return <div role="alert" className={styles.emptyState}><p>{error}</p><button type="button" onClick={onRetry} className={styles.textButton}>Try again</button></div>
  if(!courses.some(course=>course.isOpen!==false&&(course.cohorts?.length?course.cohorts.some(cohort=>acceptingApplications(cohort,programClock(course,now))):!course.requiresCohort&&acceptingApplications(course,programClock(course,now)))))return <div className={styles.emptyState}><BookOpen size={28} aria-hidden="true"/><h3>Data not available</h3><p>No open programs to display.</p><a href="https://www.shecancodeschool.org/" className={styles.textButton}>Visit SheCanCode<ArrowUpRight size={15} aria-hidden="true"/></a></div>
  return <FormField control={form.control} name="courseId" render={({field})=><FormItem>
    <fieldset role="radiogroup" aria-required="true" aria-describedby="program-selection-error cohort-selection-error"><legend className={styles.programLegend}>Choose a program and cohort</legend><div className={styles.programGrid}>
      {courses.flatMap(course=>{
        const clock=programClock(course,now)
        if(course.isOpen===false)return []
        const options=course.cohorts?.length ? course.cohorts.filter(cohort=>acceptingApplications(cohort,clock)) : course.requiresCohort ? [] : acceptingApplications(course,clock)?[null]:[]
        return options.map(cohort=>{
          const meta=cohort||course
          const key=cohort?.id||course.id
          const selected=selectedId===course.id&&(cohort?cohortId===cohort.id:!cohortId)
          const label=cohort?.cohortLabel||course.cohortLabel||"Cohort unavailable"
          const closing=meta.closesAt?new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Kigali",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(meta.closesAt)):"Date not available"
          return <label key={key} className={`${styles.programCard} ${styles.simpleProgram}`}>
            <input type="radio" required name={field.name} value={key} checked={selected} onChange={()=>{field.onChange(course.id);form.setValue("cohortId",cohort?.id||"",{shouldDirty:true});form.clearErrors("cohortId")}} onBlur={field.onBlur} ref={field.ref} className={styles.programRadio} aria-label={`${course.name}, ${label}. Closes ${closing}, Kigali time.`}/>
            <div className={styles.sketchTop}><span className={styles.readonlyCohort}>{label}</span><span className={styles.openBadge}>Open</span></div>
            <span className={styles.programName}>{course.name}{selected&&<Check size={18} aria-hidden="true"/>}</span>
            <div className={styles.cardClosing}><span>Closes · Kigali time</span><strong>{closing}</strong></div>
          </label>
        })
      })}
    </div></fieldset><FormMessage id="program-selection-error"/>{form.formState.errors.cohortId&&<p id="cohort-selection-error" role="alert" className="text-sm text-red-700">{form.formState.errors.cohortId.message}</p>}
  </FormItem>}/>
}
