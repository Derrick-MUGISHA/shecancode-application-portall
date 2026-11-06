import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { revalidateTag } from "next/cache"
import { getPreloadedPrograms, getAllPreloadedPrograms, PROGRAM_CACHE_TAG } from "@/lib/program-data"
import { courseDetailsSchema } from "@/lib/cohorts"

export async function GET(request: Request) {
  try {
    const openOnly = new URL(request.url).searchParams.get("open") === "true"
    if (openOnly) return NextResponse.json(await getPreloadedPrograms(), { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=30" } })
    return NextResponse.json(await getAllPreloadedPrograms(),{headers:{"Cache-Control":"no-store"}})
  } catch (error) {
    console.error("Error fetching courses:", error)
    return NextResponse.json({ message: "Failed to fetch courses" }, { status: 500 })
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

    revalidateTag(PROGRAM_CACHE_TAG, { expire: 0 })
    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    console.error("Error creating course:", error)
    return NextResponse.json({ message: "Failed to create course" }, { status: 500 })
  }
}
