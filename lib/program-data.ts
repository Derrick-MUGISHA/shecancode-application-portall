import { unstable_cache } from "next/cache"
import prisma from "@/lib/prisma"
import { acceptingApplications, remainingSpaces } from "./program-availability"
import { availableProgram, cohortLabel } from "./cohorts"
import type { Program } from "./program-types"

export const PROGRAM_CACHE_TAG = "application-programs"
const readCachedPrograms = unstable_cache(async()=>{
  const courses=await prisma.course.findMany({include:{cohorts:{include:{_count:{select:{applications:true}}},orderBy:{number:"asc"}},_count:{select:{applications:true}}},orderBy:{name:"asc"}})
  return courses.map(course=>({
    id:course.id,createdAt:course.createdAt?.toISOString(),requiresCohort:course.requiresCohort,name:course.name,description:course.description,isOpen:course.isOpen,
    cohortLabel:course.cohortLabel,capacity:course.capacity,closesAt:course.closesAt?.toISOString()??null,
    applicationCount:course._count.applications,spacesLeft:remainingSpaces(course),
    cohorts:(course.cohorts || []).map(cohort=>({id:cohort.id,number:cohort.number,cohortLabel:cohortLabel(cohort.number),capacity:cohort.capacity,closesAt:cohort.closesAt?.toISOString()??null,isOpen:cohort.isOpen,applicationCount:cohort._count.applications,spacesLeft:remainingSpaces(cohort)})),
  }))
},["application-programs-v2"],{revalidate:30,tags:[PROGRAM_CACHE_TAG]})
export async function getAllPreloadedPrograms(): Promise<Program[]> {
  const programs=await readCachedPrograms()
  const serverTime=new Date().toISOString()
  return programs.map(program=>({...program,serverTime}))
}

export async function getPreloadedPrograms(): Promise<Program[]> {
  return (await getAllPreloadedPrograms()).filter(program=>availableProgram(program))
}
