import { randomUUID } from "node:crypto"
import type { PrismaClient, Prisma } from "@prisma/client"
import { acceptingApplications } from "./program-availability"
import { cohortLabel } from "./cohorts"

export class ProgramUnavailableError extends Error {
  constructor(message:string, public field: "courseId" | "cohortId" = "courseId") { super(message) }
}

export async function createApplicationWithAvailability(prisma: PrismaClient, data: Prisma.ApplicationUncheckedCreateInput) {
  for (let attempt=0;attempt<3;attempt++) {
    try {
      return await prisma.$transaction(async tx=>{
        const course=await tx.course.findUnique({where:{id:data.courseId!},include:{_count:{select:{applications:true,cohorts:true}}}})
        if (!course || course.isOpen===false) throw new ProgramUnavailableError("This program is no longer accepting applications.")
        if (course.requiresCohort || course._count?.cohorts>0) {
          if (!data.cohortId) throw new ProgramUnavailableError("Choose an open cohort for this program.","cohortId")
          const cohort=await tx.cohort.findUnique({where:{id:data.cohortId},include:{_count:{select:{applications:true}}}})
          if (!cohort || cohort.courseId!==course.id || !acceptingApplications(cohort)) throw new ProgramUnavailableError("This cohort is full or closed. Choose another open cohort for this program.","cohortId")
          // Serialize submissions per cohort so independent cohorts keep separate capacities.
          await tx.cohort.update({where:{id:cohort.id},data:{submissionLock:randomUUID()}})
          if (!acceptingApplications(cohort)) throw new ProgramUnavailableError("Applications for this cohort have closed.","cohortId")
          return tx.application.create({data:{...data,cohortLabel:cohortLabel(cohort.number)},select:{id:true}})
        }
        // Keep older applications/programs intact until an administrator creates cohorts.
        if (data.cohortId) throw new ProgramUnavailableError("This cohort does not belong to the selected program.","cohortId")
        if (!acceptingApplications(course)) throw new ProgramUnavailableError("This cohort is full or no longer accepting applications. Please choose another open program.")
        await tx.course.update({where:{id:course.id},data:{submissionLock:randomUUID()}})
        if (!acceptingApplications(course)) throw new ProgramUnavailableError("Applications for this program have closed.")
        return tx.application.create({data:{...data,cohortId:undefined,cohortLabel:course.cohortLabel},select:{id:true}})
      })
    } catch(error) {
      if (error && typeof error==="object" && "code" in error && error.code==="P2034" && attempt<2) continue
      throw error
    }
  }
  throw new Error("Could not reserve an application space. Please try again.")
}
