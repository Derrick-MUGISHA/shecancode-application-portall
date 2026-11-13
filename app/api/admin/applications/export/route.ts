import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { canDownloadEducationDocument } from "@/lib/verify-document-admin"

const headers = { "Cache-Control": "private, no-store" }
const schema = z.object({ ids: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(10000).refine(ids => new Set(ids).size === ids.length) })

// Full answers are fetched only for an explicitly requested export.
export async function POST(request: Request) {
  if (!await canDownloadEducationDocument(request)) return NextResponse.json({ message: "Administrator sign-in required" }, { status: 401, headers })
  try {
    const result = schema.safeParse(await request.json())
    if (!result.success) return NextResponse.json({ message: "Choose valid applications to export." }, { status: 400, headers })
    const applications = await prisma.application.findMany({
      where: { id: { in: result.data.ids } },
      include: { course: { select: { name: true, cohortLabel: true } }, cohort: { select: { number: true } } },
    })
    if (applications.length !== result.data.ids.length) return NextResponse.json({ message: "The application list changed. Refresh it before exporting." }, { status: 409, headers })
    const byId = new Map(applications.map(application => [application.id, application]))
    return NextResponse.json({ applications: result.data.ids.map(id => byId.get(id)) }, { headers })
  } catch {
    return NextResponse.json({ message: "Unable to export applications. Please try again." }, { status: 500, headers })
  }
}
