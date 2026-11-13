import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { invalidatePrograms } from "@/lib/program-data"
import { saveProgramCohort, cohortErrorResponse } from "@/lib/cohort-admin"

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params
    const cohort=await saveProgramCohort(prisma,id,await request.json())
    invalidatePrograms()
    return NextResponse.json(cohort,{status:201})
  } catch(error) {return cohortErrorResponse(error)}
}
