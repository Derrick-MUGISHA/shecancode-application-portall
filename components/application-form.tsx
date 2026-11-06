"use client"

import { createPortal } from "react-dom"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type FieldErrors } from "react-hook-form"
import type { z } from "zod"
import { Loader2, ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { formatPhoneNumber } from "@/lib/phone"
import { DRAFT_STORAGE_KEY, PROGRAM_STORAGE_KEY, encodeDraft, decodeDraft, encodeProgramCache, decodeProgramCache } from "@/lib/application-storage"
import { restoredApplicationStep } from "@/lib/application-progress"
import { selectedAvailability, availableProgram } from "@/lib/cohorts"
import { formSchema } from "@/lib/form-schema"
import { acceptingApplications, programClock } from "@/lib/program-availability"
import { APPLICATION_STEPS, applicationStepSchemas, applicationStepForField } from "@/lib/application-steps"
import ApplicationReview from "./application-review"
import styles from "./application-wizard.module.css"
import CourseSelection, { type Course } from "@/components/form-sections/course-selection"
import PersonalInformation from "@/components/form-sections/personal-information"
import DisabilityInformation from "@/components/form-sections/disability-information"
import ContactInformation from "@/components/form-sections/contact-information"
import FamilyEquipment from "@/components/form-sections/family-equipment"
import EducationOccupation from "@/components/form-sections/education-occupation"
import AdditionalInformation from "@/components/form-sections/additional-information"

type FormValues = z.infer<typeof formSchema>


export default function ApplicationForm({ initialPrograms, initialStep }: { initialPrograms?: Course[]; initialStep?: number }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [courseLoading, setCourseLoading] = useState(initialPrograms === undefined)
  const [navigationHost, setNavigationHost] = useState<HTMLElement | null>(null)
  const [draftReady, setDraftReady] = useState(false)
  const stepRef = useRef(0)
  const programRequest = useRef<Promise<void> | null>(null)
  const lastProgramFetch = useRef(initialPrograms === undefined ? 0 : Date.now())
  const [courseError, setCourseError] = useState<string | null>(null)
  const [stepError, setStepError] = useState("")
  const [draftSaved, setDraftSaved] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const progressStart = useRef<HTMLElement>(null)
  const hasMounted = useRef(false)
  const [courses, setCourses] = useState<Course[]>(() => initialPrograms?.map(program => ({ ...program, clientReceivedAt: Date.now() })) || [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const storePrograms = useCallback((programs: Course[]) => {
    const received = programs.map(program => ({ ...program, clientReceivedAt: Date.now() }))
    setCourses(received)
    lastProgramFetch.current = Date.now()
    try { localStorage.setItem(PROGRAM_STORAGE_KEY, encodeProgramCache(received)) } catch { /* Cache is optional. */ }
  }, [])

  const fetchCourses = useCallback((showLoading = true): Promise<void> => {
    if (programRequest.current) return programRequest.current
    const request = (async () => {
      if (showLoading) { setCourseLoading(true); setCourseError(null) }
      try {
        const response = await fetch("/api/courses?open=true", { signal: AbortSignal.timeout(60000) })
        if (!response.ok) throw new Error("Unable to load programs")
        storePrograms(await response.json())
        setCourseError(null)
      } catch {
        if (showLoading) setCourseError("We couldn’t load open programs. Please check your connection and try again.")
      } finally {
        setCourseLoading(false)
        programRequest.current = null
      }
    })()
    programRequest.current = request
    return request
  }, [storePrograms])

  useEffect(() => {
    setNavigationHost(document.getElementById("application-step-navigation"))
    if (initialPrograms !== undefined) {
      storePrograms(initialPrograms)
      setCourseLoading(false)
    } else {
      let cached = null
      try {
        const raw = localStorage.getItem(PROGRAM_STORAGE_KEY)
        cached = raw ? decodeProgramCache(raw) : null
      } catch { /* Recover by loading live programs. */ }
      if (cached) {
        setCourses(cached.programs)
        if (cached.fresh) lastProgramFetch.current = Date.now()
        setCourseLoading(false)
        if (!cached.fresh) void fetchCourses(false)
      } else {
        void fetchCourses()
      }
    }
    const refresh = () => {
      if (document.visibilityState === "visible" && Date.now() - lastProgramFetch.current >= 30000) void fetchCourses(false)
    }
    const interval = setInterval(refresh, 30000)
    window.addEventListener("focus", refresh)
    return () => { clearInterval(interval); window.removeEventListener("focus", refresh) }
  }, [fetchCourses, initialPrograms, storePrograms])

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      nationality: "",
      refugeeStatus: false,
      identificationNumber: "",
      occupationDetails: "",
      hasDisability: false,
      province: "",
      district: "",
      sector: "",
      cell: "",
      village: "",
      emergencyContactName: "",
      emergencyContactRelation: "",
      emergencyContactPhone: "",
      hasYoungChild: false,
      hasLaptop: false,
      academicBackground: "",
      howDidYouKnow: "SOCIAL_MEDIA",
      howDidYouKnowSpecification: "", // Add the new field
      motivation: "",
      linkedInProfile: "",
      githubProfile: "",
    },
  })

  // Load the confirmation route while the applicant reviews their answers.
  useEffect(() => { if (step === 3) router.prefetch("/apply/success") }, [step, router])

  // Handle form submission
  async function onSubmit(data: FormValues) {
    setIsSubmitting(true)
    try {
      const { educationDocument, ...applicationData } = data
      const payload = new FormData()
      payload.append("application", JSON.stringify(applicationData))
      if (educationDocument) payload.append("educationDocument", educationDocument)
      const response = await fetch("/api/applications", {
        method: "POST",
        body: payload,
      })

      const responseData = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400) {
          if (responseData.errors) {
            const firstField = Object.keys(responseData.errors)[0]
            const errorStep = applicationStepForField(firstField)
            if (errorStep >= 0) setStep(errorStep)
            if (firstField === "courseId" || firstField === "cohortId") void fetchCourses()
            setStepError("Please check the highlighted fields before continuing.")
            for (const [name, messages] of Object.entries(responseData.errors)) {
              const message = (messages as string[])?.[0]
              if (message) form.setError(name as keyof FormValues, { type: "server", message })
            }
            return
          }
          // If the error message contains a field name, set the error for that field
          if (responseData.message.includes("is required")) {
            const fieldName = responseData.message.split(" is required")[0]
            form.setError(fieldName as any, {
              type: "server",
              message: responseData.message,
            })
          } else if (responseData.message.includes("email already exists")) {
            form.setError("email", {
              type: "server",
              message: "An application with this email already exists",
            })
            setFormError("An application with this email already exists")
            setStep(1)
          } else {
            // For other validation errors, show a toast
            toast({
              title: "Validation Error",
              description: responseData.message,
              variant: "destructive",
            })
          }
        } else {
          throw new Error(responseData.message || "Failed to submit application")
        }
        return
      }

      // Clear form data from localStorage after successful submission
      try { localStorage.removeItem(DRAFT_STORAGE_KEY) } catch { /* Submission succeeded even when storage is unavailable. */ }

      toast({
        title: "Application Submitted",
        description: "Your application has been successfully submitted.",
      })

      // Redirect to success page or home
      router.push("/apply/success")
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to submit application. Please try again.")
      console.error("Error submitting application:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit application",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      const saved = raw ? decodeDraft(raw) : null
      if (saved) {
        const answers = saved.values
        if (answers.dateOfBirth) answers.dateOfBirth = new Date(String(answers.dateOfBirth))
        if (typeof answers.phone === "string") answers.phone = formatPhoneNumber(answers.phone)
        if (typeof answers.emergencyContactPhone === "string") answers.emergencyContactPhone = formatPhoneNumber(answers.emergencyContactPhone)
        form.reset({ ...form.getValues(), ...answers })
        const restoredStep = restoredApplicationStep(answers, saved.step, initialStep, initialPrograms ?? [])
        stepRef.current = restoredStep
        setStep(restoredStep)
        setDraftRestored(Boolean(answers.fullName || answers.email))
        setDraftSaved(true)
      }
    } catch {
      setStorageUnavailable(true)
    } finally {
      setDraftReady(true)
    }
  }, [form])

  const saveDraft = useCallback(() => {
    const values = form.getValues()
    if (!values.courseId && !values.fullName && !values.email) return
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, encodeDraft(values, stepRef.current))
      setDraftSaved(true)
      setStorageUnavailable(false)
    } catch {
      setStorageUnavailable(true)
    }
  }, [form])

  useEffect(() => {
    if (!draftReady) return
    stepRef.current = step
    const url = new URL(window.location.href)
    if (url.searchParams.get("step") !== String(step + 1)) {
      url.searchParams.set("step", String(step + 1))
      window.history.replaceState(window.history.state, "", url)
    }
    saveDraft()
  }, [step, draftReady, saveDraft])

  useEffect(() => {
    if (!draftReady) return
    const subscription = form.watch(saveDraft)
    window.addEventListener("pagehide", saveDraft)
    return () => { subscription.unsubscribe(); window.removeEventListener("pagehide", saveDraft) }
  }, [form, saveDraft, draftReady])

  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return }
    stepHeading.current?.focus({ preventScroll: true })
    stepHeading.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    })
  }, [step])

  function goToStep(next: number, validatedForward = false) {
    if (!Number.isInteger(next) || next < 0 || next > 3) return
    if (next > step && (!validatedForward || next !== step + 1)) return
    stepRef.current = next
    setDraftRestored(false)
    setStepError("")
    setFormError(null)
    setStep(next)
  }

  function continueStep() {
    form.clearErrors([...APPLICATION_STEPS[step].fields])
    const result = applicationStepSchemas[step].safeParse(form.getValues())
    if (!result.success) {
      for (const issue of result.error.issues) {
        form.setError(issue.path[0] as keyof FormValues, { type: "validate", message: issue.message })
      }
      setStepError("Please complete the highlighted fields to continue.")
      form.setFocus(result.error.issues[0].path[0] as keyof FormValues)
      return
    }
    if (step === 0) {
      const program = courses.find(item => item.id === form.getValues("courseId"))
      if (program?.cohorts?.length) {
        const cohort = selectedAvailability(program, form.getValues("cohortId"))
        if (!cohort || !acceptingApplications(cohort, programClock(program))) {
          form.setError("cohortId", { type: "validate", message: "Choose an open cohort for your program." })
          setStepError("Choose an open cohort to continue.")
          return
        }
      }
    }
    if (step === 0 && !courses.some(course => course.id === form.getValues("courseId") && availableProgram(course, programClock(course)))) {
      form.setError("courseId", { type: "validate", message: "Please choose an available program." })
      setStepError("Please select an open program to continue.")
      return
    }
    goToStep(Math.min(step + 1, 3), true)
  }

  function handleInvalid(errors: FieldErrors<FormValues>) {
    const firstField = Object.keys(errors)[0]
    const invalidStep = applicationStepForField(firstField)
    if (invalidStep >= 0) setStep(invalidStep)
    requestAnimationFrame(() => form.setFocus(firstField as keyof FormValues))
    setStepError("Please check the highlighted fields before submitting.")
  }

  const values = form.watch()
  const selectedProgram = courses.find(course => course.id === values.courseId)
  const selectedCohort = selectedProgram?.cohorts?.find(cohort => cohort.id === values.cohortId)
  const selectedCohortLabel = selectedCohort?.cohortLabel || selectedProgram?.cohortLabel
  const currentStep = APPLICATION_STEPS[step]

  const navigation = (
        <nav ref={progressStart} aria-label="Application progress" className={styles.progressNav}>
          <p className={styles.sidebarHeading}>YOUR APPLICATION</p>
          <ol className={styles.progressSteps}>
            {APPLICATION_STEPS.map((item, index) => (
              <li key={item.title} className={index <= step ? styles.activeStep : undefined}>
                <button type="button" aria-controls="application-content" aria-label={`Step ${index + 1} of 4: ${item.title}. ${index < step ? "Completed" : index === step ? "Current step" : "Not yet completed"}`} disabled={index > step || isSubmitting || !draftReady}
                  onClick={() => goToStep(index)} aria-current={index === step ? "step" : undefined}>
                  <span className={styles.stepNumber}>{index < step ? <Check size={16} aria-hidden="true" /> : index + 1}</span>
                  <span className={styles.mobileStepLabel}>{item.shortTitle}</span>
                  <span className={styles.desktopStepLabel}>{item.title}<small>{index < step ? "Completed" : index === step ? "Current step" : "Up next"}</small></span>
                </button>
              </li>
            ))}
          </ol>

        </nav>
  )

  return (
    <>
      {navigationHost && createPortal(navigation, navigationHost)}
      <Card className={styles.formCard}>
      <CardContent className={styles.formBody}>
        <div className={styles.stepHeader}>
          <p className={styles.stepCount}>STEP {step + 1} OF 4</p>
          <h2 id="application-step-title" ref={stepHeading} tabIndex={-1} className={styles.stepTitle}>{currentStep.title}</h2>
          <p>{currentStep.description}</p>
          {selectedProgram && step > 0 && <p className={styles.selectedProgram}><BookOpenLabel />{selectedProgram.name}{selectedCohortLabel ? ` · ${selectedCohortLabel}` : ""}</p>}
        </div>

        {draftRestored && <p role="status" className={styles.draftNotice}>Welcome back. Your saved answers are restored at the first unfinished step. Re-enter your ID number and select attachments again when requested.</p>}
        <Form {...form}>
          <form noValidate aria-labelledby="application-step-title" aria-busy={isSubmitting} onSubmit={(event) => {
            if (step < 3) { event.preventDefault(); continueStep() }
            else void form.handleSubmit(onSubmit, handleInvalid)(event)
          }} className={styles.form}>
            <section hidden={step !== 0} aria-label="Open Programs">
              <CourseSelection form={form} courses={courses} loading={courseLoading} error={courseError} onRetry={() => void fetchCourses()} />
            </section>
            <section hidden={step !== 1} aria-label="About You" className="space-y-8">
              <PersonalInformation form={form} />
              <DisabilityInformation form={form} />
              <ContactInformation form={form} />
            </section>
            <section hidden={step !== 2} aria-label="Education and Background" className="space-y-8">
              <EducationOccupation form={form} />
              <FamilyEquipment form={form} />
            </section>
            <section hidden={step !== 3} aria-label="Review and Submit" className="space-y-8">
              <AdditionalInformation form={form} />
              <ApplicationReview values={values} programName={selectedProgram?.name} cohortLabel={selectedCohortLabel} onEdit={index => goToStep(index)} />
              <p className={styles.submitNote}><ShieldCheck size={18} aria-hidden="true" />Ready? Submit once you have checked that your details are correct.</p>
            </section>

            {(stepError || formError) && <p role="alert" className={styles.error}>{stepError || formError}</p>}
            <div className={styles.navigation}>
              {step > 0 ? <Button type="button" variant="outline" onClick={() => goToStep(step - 1)} disabled={isSubmitting}><ArrowLeft size={16} className="mr-2" aria-hidden="true" />Back</Button> : <span />}
              {step < 3 ? (
                <Button key="continue" type="button" onClick={continueStep} disabled={step === 0 && (courseLoading || !!courseError || !courses.length)}>
                  Continue <ArrowRight size={16} className="ml-2" aria-hidden="true" />
                </Button>
              ) : (
                <Button key="submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : "Submit Application"}
                </Button>
              )}
            </div>
            <p role="status" className={styles.saveNote}>
              {storageUnavailable ? "Draft saving is unavailable. Keep this page open to retain your answers." :
                draftSaved ? "Draft saved on this device. ID numbers and attachments are not saved." :
                "Complete one step at a time. You can go back without losing your answers."}
            </p>
          </form>
        </Form>
      </CardContent>
      </Card>
    </>
  )
}

function BookOpenLabel() {
  return <span className={styles.programDot} aria-hidden="true" />
}
