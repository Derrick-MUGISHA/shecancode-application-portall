import { revalidateTag } from "next/cache"
import prisma from "@/lib/prisma"
import { remainingSpaces } from "./program-availability"
import { availableProgram, cohortLabel } from "./cohorts"
import { compareProgramOrder } from "./program-order"
import type { Program } from "./program-types"

export const PROGRAM_CACHE_TAG = "application-programs"
// A blocking, short-lived snapshot: expired data is never served while refreshing.
// Share concurrent reads so polling applicants don't each repeat the count queries.
let snapshot: { programs: Program[]; expiresAt: number } | undefined
let pending: Promise<Program[]> | undefined
let generation = 0

export function invalidatePrograms() {
  generation++
  snapshot = undefined
  pending = undefined
  revalidateTag(PROGRAM_CACHE_TAG, { expire: 0 })
}

export async function readProgramsFresh(): Promise<Program[]> {
  const [courses, counts] = await Promise.all([
    prisma.course.findMany({ include: { cohorts: true } }),
    // Legacy MongoDB documents can omit cohortId/courseId. Normalize missing
    // keys before grouping, using a native aggregation to avoid Prisma 5 groupBy engine panics.
    prisma.application.aggregateRaw({ pipeline: [
      { $group: { _id: { courseId: { $ifNull: ["$courseId", null] }, cohortId: { $ifNull: ["$cohortId", null] } }, total: { $sum: 1 } } },
      { $project: { _id: 0, courseId: { $toString: "$_id.courseId" }, cohortId: { $toString: "$_id.cohortId" }, _count: { _all: "$total" } } },
    ] }),
  ])
  const programCounts = new Map<string, number>()
  const cohortCounts = new Map<string, number>()
  for (const count of counts as unknown as { courseId: string | null; cohortId: string | null; _count: { _all: number } }[]) {
    if (count.courseId) programCounts.set(count.courseId, (programCounts.get(count.courseId) || 0) + count._count._all)
    if (count.cohortId) cohortCounts.set(count.cohortId, (cohortCounts.get(count.cohortId) || 0) + count._count._all)
  }
  return courses.map(course => {
    const applicationCount = programCounts.get(course.id) || 0
    return {
      id: course.id, displayOrder: course.displayOrder, createdAt: course.createdAt.toISOString(),
      requiresCohort: course.requiresCohort, name: course.name, description: course.description, isOpen: course.isOpen,
      cohortLabel: course.cohortLabel, capacity: course.capacity, closesAt: course.closesAt?.toISOString() ?? null,
      applicationCount, spacesLeft: remainingSpaces({ ...course, applicationCount }),
      cohorts: course.cohorts.map(cohort => {
        const applicationCount = cohortCounts.get(cohort.id) || 0
        return {
          id: cohort.id, displayOrder: cohort.displayOrder, createdAt: cohort.createdAt.toISOString(),
          number: cohort.number, cohortLabel: cohortLabel(cohort.number), capacity: cohort.capacity,
          closesAt: cohort.closesAt?.toISOString() ?? null, isOpen: cohort.isOpen,
          applicationCount, spacesLeft: remainingSpaces({ ...cohort, applicationCount }),
        }
      }).sort(compareProgramOrder),
    }
  }).sort(compareProgramOrder)
}

export async function getAllPreloadedPrograms(): Promise<Program[]> {
  if (!snapshot || snapshot.expiresAt <= Date.now()) {
    if (!pending) {
      const version = generation
      const request = readProgramsFresh().then(programs => {
        if (version === generation) snapshot = { programs, expiresAt: Date.now() + 2000 }
        return programs
      }).finally(() => { if (pending === request) pending = undefined })
      pending = request
    }
    const version = generation
    const programs = await pending
    // A write during the read must not put old availability back on screen.
    if (version !== generation) return getAllPreloadedPrograms()
    return programs.map(program => ({ ...program, serverTime: new Date().toISOString() }))
  }
  return snapshot.programs.map(program => ({ ...program, serverTime: new Date().toISOString() }))
}

export async function getPreloadedPrograms(): Promise<Program[]> {
  return (await getAllPreloadedPrograms()).filter(program => availableProgram(program))
}
