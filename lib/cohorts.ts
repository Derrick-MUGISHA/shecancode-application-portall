import { z } from "zod"
import { acceptingApplications, remainingSpaces, type ProgramAvailability } from "./program-availability"

export const courseDetailsSchema = z.object({
  name: z.string().trim().min(2, "Enter a program name of at least 2 characters.").max(150),
  description: z.string().trim().max(10000).nullable().optional(),
  isOpen: z.boolean().optional(),
})
export function cohortSettingsFor(existing?: { isOpen: boolean; closesAt: Date | string | null }, now = Date.now()) {
  return z.object({
    number: z.number().int().min(1, "Use cohort-1, cohort-2, and so on.").max(100000),
    capacity: z.number().int().min(1).max(100000).nullable(),
    closesAt: z.string().datetime({ offset: true }).nullable(),
    isOpen: z.boolean(),
  }).superRefine((data, ctx) => {
    if (!data.isOpen) return
    if (data.capacity == null) ctx.addIssue({ code: "custom", path: ["capacity"], message: "Enter the total application spaces for this cohort." })
    const sameDate = existing?.isOpen && existing.closesAt && data.closesAt && Math.floor(new Date(existing.closesAt).getTime() / 60000) === Math.floor(new Date(data.closesAt).getTime() / 60000)
    if (!data.closesAt || (!sameDate && new Date(data.closesAt).getTime() <= now)) ctx.addIssue({ code: "custom", path: ["closesAt"], message: "Choose a future closing date and time in Kigali time." })
  })
}
export function cohortLabel(number: number) { return `cohort-${number}` }
export function cohortSummary<T extends ProgramAvailability & { number: number }>(cohort: T) {
  return { ...cohort, cohortLabel: cohortLabel(cohort.number), spacesLeft: remainingSpaces(cohort) }
}
export function availableProgram(program: ProgramAvailability & { requiresCohort?: boolean; cohorts?: ProgramAvailability[] }, now = Date.now()) {
  if (program.isOpen === false || (program.requiresCohort && !program.cohorts?.length)) return false
  return program.cohorts?.length ? program.cohorts.some(cohort => acceptingApplications(cohort, now)) : acceptingApplications(program, now)
}
export function selectedAvailability<T extends ProgramAvailability & { cohorts?: (ProgramAvailability & { id: string })[] }>(program: T, cohortId?: string) {
  if (!program.cohorts?.length) return program
  const cohort = program.cohorts.find(item => item.id === cohortId)
  return cohort ? { ...cohort, isOpen: program.isOpen !== false && cohort.isOpen !== false } : undefined
}

export function visibleAdminCohorts<T extends ProgramAvailability>(program: { isOpen?: boolean; cohorts?: T[] }, openOnly: boolean, now = Date.now()): T[] {
  const cohorts = program.cohorts || []
  if (!openOnly) return cohorts
  return program.isOpen === false ? [] : cohorts.filter(cohort => acceptingApplications(cohort, now))
}
