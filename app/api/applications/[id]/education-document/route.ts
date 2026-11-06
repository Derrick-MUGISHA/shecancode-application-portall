import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { canDownloadEducationDocument } from "@/lib/verify-document-admin"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await canDownloadEducationDocument(request)) return NextResponse.json({ message: "Administrator sign-in required" }, { status: 401 })
  const { id } = await params
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ message: "Invalid application ID" }, { status: 400 })
  try {
    const document = await prisma.educationDocument.findUnique({ where: { applicationId: id } })
    if (!document) return NextResponse.json({ message: "Attachment not found" }, { status: 404 })
    return new Response(new Uint8Array(document.data), {
      headers: {
        "Content-Type": document.contentType,
        "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(document.name),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ message: "Failed to download attachment" }, { status: 500 })
  }
}
