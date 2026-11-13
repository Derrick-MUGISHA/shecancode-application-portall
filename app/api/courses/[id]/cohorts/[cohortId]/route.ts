import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { invalidatePrograms } from "@/lib/program-data"
import { saveProgramCohort, cohortErrorResponse, CohortSettingsError } from "@/lib/cohort-admin"

type Context={params:Promise<{id:string;cohortId:string}>}
export async function PATCH(request:Request,{params}:Context) {
  try {
    const {id,cohortId}=await params
    const cohort=await saveProgramCohort(prisma,id,await request.json(),cohortId)
    invalidatePrograms()
    return NextResponse.json(cohort)
  } catch(error) {return cohortErrorResponse(error)}
}
export async function DELETE(_request:Request,{params}:Context) {
  try {
    const {id,cohortId}=await params
    await prisma.$transaction(async tx=>{
      const cohort=await tx.cohort.findFirst({where:{id:cohortId,courseId:id},include:{_count:{select:{applications:true}}}})
      if(!cohort) throw new CohortSettingsError("Cohort not found in this program.",undefined,404)
      if(cohort._count.applications) throw new CohortSettingsError("A cohort with applications cannot be deleted. Close it instead.")
      await tx.cohort.delete({where:{id:cohort.id}})
    })
    invalidatePrograms()
    return NextResponse.json({success:true})
  } catch(error){return cohortErrorResponse(error)}
}
