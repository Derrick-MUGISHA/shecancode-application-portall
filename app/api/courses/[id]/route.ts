import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { revalidateTag } from "next/cache"
import { PROGRAM_CACHE_TAG } from "@/lib/program-data"
import { courseDetailsSchema } from "@/lib/cohorts"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const course = await prisma.course.findUnique({
      where: {
        id,
      },
    })

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error("Error fetching course:", error)
    return NextResponse.json({ message: "Failed to fetch course" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    if (body.isOpen !== undefined && typeof body.isOpen !== "boolean") return NextResponse.json({ message: "Invalid program availability" }, { status: 400 })

    // Validate course exists
    const existingCourse = await prisma.course.findUnique({
      where: {
        id,
      },
    })

    if (!existingCourse) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    const result = courseDetailsSchema.safeParse({...existingCourse,...body})
    if (!result.success) return NextResponse.json({message:result.error.issues[0].message,errors:result.error.flatten().fieldErrors},{status:400})
    const updatedCourse = await prisma.course.update({where:{id},data:result.data})

    revalidateTag(PROGRAM_CACHE_TAG, { expire: 0 })
    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error("Error updating course:", error)
    return NextResponse.json({ message: "Failed to update course" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Check if course exists
    const existingCourse = await prisma.course.findUnique({
      where: {
        id,
      },
    })

    if (!existingCourse) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    // Check if course has applications
    const applicationCount = await prisma.application.count({
      where: {
        courseId: id,
      },
    })

    if (applicationCount > 0) {
      return NextResponse.json({ message: "Cannot delete course with existing applications" }, { status: 400 })
    }

    const cohortCount = await prisma.cohort.count({where:{courseId:id}})
    if (cohortCount) return NextResponse.json({message:"Remove this program’s empty cohorts before deleting the program."},{status:400})
    // Delete course
    await prisma.course.delete({
      where: {
        id,
      },
    })

    revalidateTag(PROGRAM_CACHE_TAG, { expire: 0 })
    return NextResponse.json({ message: "Course deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting course:", error)
    return NextResponse.json({ message: "Failed to delete course" }, { status: 500 })
  }
}
