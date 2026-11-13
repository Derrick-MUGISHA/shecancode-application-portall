import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAllPreloadedPrograms, invalidatePrograms } from "@/lib/program-data"
import { availableProgram } from "@/lib/cohorts"
import { courseDetailsSchema } from "@/lib/cohorts"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const openOnly = new URL(request.url).searchParams.get("open") === "true"
    const programs = await getAllPreloadedPrograms()
    return NextResponse.json(openOnly?programs.filter(program=>availableProgram(program)):programs,{headers:{
      "Cache-Control":"no-store, max-age=0, must-revalidate",
      "CDN-Cache-Control":"no-store",
      "Vercel-CDN-Cache-Control":"no-store",
    }})
  } catch(error) {
    console.error("Error fetching courses:",error)
    return NextResponse.json({message:"Failed to fetch courses"},{status:500})
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = courseDetailsSchema.safeParse({ ...body, isOpen: body.isOpen ?? true })
    if (!result.success) return NextResponse.json({ message: result.error.issues[0].message, errors: result.error.flatten().fieldErrors }, { status: 400 })
    const settings = result.data

    const course = await prisma.course.create({
      data: {...settings, requiresCohort:true},
    })

    invalidatePrograms()
    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    console.error("Error creating course:", error)
    return NextResponse.json({ message: "Failed to create course" }, { status: 500 })
  }
}
