import { randomUUID } from "node:crypto"
import type { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"
import { cohortSettingsFor } from "./cohorts"

export class CohortSettingsError extends Error {
  constructor(message:string,public field?:string,public status=400){super(message)}
}
export async function saveProgramCohort(prisma:PrismaClient,courseId:string,body:unknown,id?:string) {
  return prisma.$transaction(async tx=>{
    const course=await tx.course.findUnique({where:{id:courseId},select:{id:true}})
    if(!course) throw new CohortSettingsError("Program not found.",undefined,404)
    const existing=id ? await tx.cohort.findFirst({where:{id,courseId},include:{_count:{select:{applications:true}}}}):null
    if(id && !existing) throw new CohortSettingsError("Cohort not found in this program.",undefined,404)
    const result=cohortSettingsFor(existing??undefined).safeParse(body)
    if(!result.success) throw new CohortSettingsError(result.error.issues[0].message,String(result.error.issues[0].path[0]))
    const data=result.data
    if(existing?._count.applications && data.number!==existing.number) throw new CohortSettingsError("A cohort with applications cannot be renumbered. Add another cohort to this program.","number")
    if(data.capacity!=null && data.capacity<(existing?._count.applications??0)) throw new CohortSettingsError("Spaces cannot be fewer than the applications already received by this cohort.","capacity")
    const settings={...data,closesAt:data.closesAt?new Date(data.closesAt):null}
    if(existing) return tx.cohort.update({where:{id:existing.id},data:settings,select:{id:true}})
    // Coordinate with legacy submissions while the program gets its first cohort.
    await tx.course.update({where:{id:courseId},data:{requiresCohort:true,submissionLock:randomUUID()}})
    return tx.cohort.create({data:{...settings,courseId},select:{id:true}})
  })
}
export function cohortErrorResponse(error:unknown) {
  if(error instanceof CohortSettingsError) return NextResponse.json({message:error.message,errors:error.field?{[error.field]:[error.message]}:undefined},{status:error.status})
  if(error && typeof error==="object" && "code" in error) {
    if(error.code==="P2002") return NextResponse.json({message:"This program already has that cohort number.",errors:{number:["Choose a different cohort number for this program."]}},{status:409})
    if(error.code==="P2034") return NextResponse.json({message:"This cohort changed while you were saving. Please try again."},{status:409})
  }
  console.error("Cohort settings failed:",error)
  return NextResponse.json({message:"Unable to save cohort settings. Please try again."},{status:500})
}
