import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { invalidatePrograms } from "@/lib/program-data"
import { canDownloadEducationDocument as canManagePrograms } from "@/lib/verify-document-admin"

const objectId = z.string().regex(/^[a-f\d]{24}$/i)
const orderSchema = z.object({
  ids: z.array(objectId).min(1).max(1000).refine(ids => new Set(ids).size === ids.length, "Duplicate records in order."),
  courseId: objectId.optional(),
})

export async function PATCH(request: Request) {
  if (!await canManagePrograms(request)) return NextResponse.json({ message: "Administrator sign-in required." }, { status: 401 })
  try {
    const result = orderSchema.safeParse(await request.json())
    if (!result.success) return NextResponse.json({ message: "Invalid display order." }, { status: 400 })
    const { ids, courseId } = result.data
    const records = courseId
      ? await prisma.cohort.findMany({ where: { courseId }, select: { id: true } })
      : await prisma.course.findMany({ select: { id: true } })
    const existing = new Set(records.map(record => record.id))
    if (ids.length !== existing.size || ids.some(id => !existing.has(id))) {
      return NextResponse.json({ message: "Programs changed. Refresh the list and try again." }, { status: 409 })
    }
    const base = -Date.now()
    await prisma.$transaction(ids.map((id, index) => {
      const data = { displayOrder: base + index / ids.length }
      return courseId ? prisma.cohort.update({ where: { id }, data }) : prisma.course.update({ where: { id }, data })
    }))
    invalidatePrograms()
    return NextResponse.json({ message: "Display order saved." })
  } catch (error) {
    console.error("Error saving program order:", error)
    return NextResponse.json({ message: "Unable to save display order." }, { status: 500 })
  }
}
