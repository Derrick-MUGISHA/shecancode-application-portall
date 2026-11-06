"use client"
import { useState, useEffect } from "react"
import { acceptingApplications, remainingSpaces, programClock } from "@/lib/program-availability"
import { Check, ArrowUpRight, BookOpen, Loader2 } from "lucide-react"
import { FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
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
  if(!courses.length)return <div className={styles.emptyState}><BookOpen size={28} aria-hidden="true"/><h3>Data not available</h3><p>No open programs to display.</p><a href="https://www.shecancodeschool.org/" className={styles.textButton}>Visit SheCanCode<ArrowUpRight size={15} aria-hidden="true"/></a></div>
  return <FormField control={form.control} name="courseId" render={({field})=><FormItem>
    <fieldset role="radiogroup" aria-required="true" aria-describedby="program-selection-error cohort-selection-error"><legend className={styles.programLegend}>Choose a program and cohort</legend><div className={styles.programGrid}>
      {courses.map(course=>{
        const cohorts=(course.cohorts||[]).filter(cohort=>course.isOpen!==false&&acceptingApplications(cohort,programClock(course,now)))
        const hasCohorts=!!course.cohorts?.length
        const selected=selectedId===course.id
        const chosen=selected?cohorts.find(cohort=>cohort.id===cohortId):cohorts[0]
        const meta=hasCohorts?chosen:course
        const open=hasCohorts?cohorts.length>0:acceptingApplications(course,programClock(course,now))
        const closing=meta?.closesAt?new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Kigali",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(meta.closesAt)):null
        return <article key={course.id} className={`${styles.programCard} ${styles.simpleProgram}`}>
          <div className={styles.sketchTop}>
          <div className={styles.sketchCohort}>
          {hasCohorts?<Select value={chosen?.id||""} onOpenChange={opening=>{if(opening&&!selected){field.onChange(course.id);form.setValue("cohortId",cohorts[0]?.id||"");form.clearErrors("cohortId")}}} onValueChange={id=>{field.onChange(course.id);form.setValue("cohortId",id);form.clearErrors("cohortId")}} disabled={!cohorts.length}><SelectTrigger aria-label={`Cohort for ${course.name}`} aria-required="true" aria-invalid={selected&&!!form.formState.errors.cohortId} className="h-11 bg-white text-sm"><SelectValue placeholder="Choose cohort"/></SelectTrigger><SelectContent className="z-[80]">{cohorts.map(cohort=><SelectItem key={cohort.id} value={cohort.id} className="min-h-11 text-sm">{cohort.cohortLabel}</SelectItem>)}</SelectContent></Select>:<span className={styles.cohortUnavailable}>{course.cohortLabel||"Cohort unavailable"}</span>}
          </div><span className={styles.openBadge}>{open?"Open":"Closed"}</span></div>
          <label className={styles.simpleProgramChoice}>
            <input type="radio" required name={field.name} value={course.id} checked={selected} disabled={!open} onChange={()=>{field.onChange(course.id);form.setValue("cohortId",cohorts[0]?.id||"");form.clearErrors("cohortId")}} onBlur={field.onBlur} ref={field.ref} className={styles.programRadio} aria-label={course.name} aria-invalid={!!form.formState.errors.courseId}/>
            <span id={`program-name-${course.id}`} className={styles.programName}>{course.name}{selected&&<Check size={18} aria-hidden="true"/>}</span>
          </label>
          {meta&&(meta.capacity!=null||meta.closesAt)?<div className={styles.sketchBottom}>
            <div className={styles.sketchCapacity}><span>Capacity</span><strong>{meta.capacity?.toLocaleString()??"—"} spaces</strong><small>{remainingSpaces(meta)?.toLocaleString()??"—"} available</small></div>
            <div className={styles.sketchTime}><span>Closes</span><p>{closing||"Data not available"}</p><small>Kigali time</small></div>
          </div>:<p className={styles.cohortUnavailable}>{hasCohorts?"Choose a cohort to see capacity and closing time.":"Capacity and closing time not available"}</p>}

        </article>
      })}
    </div></fieldset><FormMessage id="program-selection-error"/>{form.formState.errors.cohortId&&<p id="cohort-selection-error" role="alert" className="text-sm text-red-700">{form.formState.errors.cohortId.message}</p>}
  </FormItem>}/>
}
