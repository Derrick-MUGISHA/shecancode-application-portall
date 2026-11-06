import type { Prisma } from "@prisma/client"

// Keep detail components aligned with the relations fetched by the page.
export type AdminApplication = Prisma.ApplicationGetPayload<{
  include: { course: true; cohort: true }
}>
