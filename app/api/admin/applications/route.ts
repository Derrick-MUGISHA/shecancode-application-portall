import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { fetchApplications } from "@/lib/actions"
import { canDownloadEducationDocument } from "@/lib/verify-document-admin"

export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store" }

export async function GET(request: Request) {
  if (!await canDownloadEducationDocument(request)) {
    return NextResponse.json({ message: "Administrator sign-in required" }, { status: 401, headers })
  }
  try {
    // Include related records: their names, availability and cohort counts affect the dashboard too.
    const versionData = await Promise.all([
      prisma.application.aggregate({ _count: { _all: true }, _max: { updatedAt: true } }),
      prisma.course.aggregate({ _count: { _all: true }, _max: { updatedAt: true } }),
      prisma.cohort.aggregate({ _count: { _all: true }, _max: { updatedAt: true } }),
    ])
    const version = `"${createHash("sha256").update(JSON.stringify(versionData)).digest("hex")}"`
    const responseHeaders = { ...headers, ETag: version }
    if (request.headers.get("if-none-match") === version) {
      return new Response(null, { status: 304, headers: responseHeaders })
    }
    const result = await fetchApplications()
    if (!result.success) return NextResponse.json({ message: result.message }, { status: 500, headers })
    return NextResponse.json({ applications: result.applications }, { headers: responseHeaders })
  } catch {
    return NextResponse.json({ message: "Unable to load applications." }, { status: 500, headers })
  }
}
