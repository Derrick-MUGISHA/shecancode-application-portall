import prisma from "@/lib/prisma"

// List/analytics screens need a small projection, not complete applicant answers.
// Fetch the shared relations once instead of joining/counting them for every row.
export async function readAdminApplicationRows() {
  const [rows, courses, cohorts] = await Promise.all([
    prisma.application.findMany({ select: {
      id: true, fullName: true, email: true, status: true, createdAt: true,
      courseId: true, cohortId: true, cohortLabel: true, entrySourceDomain: true,
    } }),
    prisma.course.findMany({ select: { id: true, name: true, cohortLabel: true, isOpen: true } }),
    prisma.cohort.findMany({ select: { id: true, number: true, isOpen: true, capacity: true, closesAt: true } }),
  ])
  const coursesById = new Map(courses.map(course => [course.id, course]))
  const cohortCounts = new Map<string, number>()
  for (const row of rows) {
    if (row.cohortId) cohortCounts.set(row.cohortId, (cohortCounts.get(row.cohortId) || 0) + 1)
  }
  const cohortsById = new Map(cohorts.map(cohort => [cohort.id, {
    ...cohort, _count: { applications: cohortCounts.get(cohort.id) || 0 },
  }]))
  return rows.map(({ courseId, cohortId, ...row }) => ({
    ...row,
    course: courseId ? coursesById.get(courseId) || null : null,
    cohort: cohortId ? cohortsById.get(cohortId) || null : null,
  }))
}
