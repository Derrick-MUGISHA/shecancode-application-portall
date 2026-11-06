import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { revalidateTag } from "next/cache"
import { PROGRAM_CACHE_TAG } from "@/lib/program-data"
import { formSchema } from "@/lib/form-schema"
import { validateRwandaAddress } from "@/lib/rwanda-locations"
import { createApplicationWithAvailability, ProgramUnavailableError } from "@/lib/create-application"
import { matchesDocumentType } from "@/lib/education-document"

export async function GET() {
  try {
    const applications = await prisma.application.findMany({
      include: {
        course: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(applications)
  } catch (error) {
    console.error("Error fetching applications:", error)
    return NextResponse.json({ message: "Failed to fetch applications" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Keep the whole request below hosting request-size limits.
    if (Number(request.headers.get("content-length")) > 3 * 1024 * 1024) {
      return NextResponse.json({ message: "Application is too large. Attach a file of 2 MB or smaller." }, { status: 413 })
    }
    const multipart = request.headers.get("content-type")?.includes("multipart/form-data")
    let rawBody
    let document: File | undefined
    try {
      if (multipart) {
        const payload = await request.formData()
        rawBody = JSON.parse(String(payload.get("application")))
        const attachment = payload.get("educationDocument")
        if (attachment instanceof File) document = attachment
      } else {
        rawBody = await request.json()
      }
    } catch {
      return NextResponse.json({ message: "Invalid application data." }, { status: 400 })
    }
    const result = formSchema.safeParse({
      ...rawBody,
      dateOfBirth: new Date(rawBody?.dateOfBirth),
      educationDocument: document,
    })
    if (!result.success) {
      return NextResponse.json({ message: result.error.issues[0].message, errors: result.error.flatten().fieldErrors }, { status: 400 })
    }
    const { educationDocument, ...body } = result.data
    const address = validateRwandaAddress(body)
    if (!address.valid) return NextResponse.json({ message: "Please select a valid Rwanda address hierarchy.", errors: { province: ["Please reselect your province, district, sector, cell and village."] } }, { status: 400 })
    const documentBytes = educationDocument ? Buffer.from(await educationDocument.arrayBuffer()) : undefined
    if (documentBytes && !matchesDocumentType(documentBytes, educationDocument!.type)) {
      return NextResponse.json({ message: "The attachment does not match its file type.", errors: { educationDocument: ["Please choose a valid PDF, JPG or PNG."] } }, { status: 400 })
    }

    // The unique email index rejects duplicates atomically; avoid an extra
    // database round trip before every submission.
    // Create application
    const application = await createApplicationWithAvailability(prisma, {
        fullName: body.fullName,
        email: body.email,
        dateOfBirth: new Date(body.dateOfBirth),
        gender: body.gender,
        phone: body.phone,
        nationality: body.nationality,
        refugeeStatus: body.refugeeStatus,
        identificationNumber: body.identificationNumber,

        hasDisability: body.hasDisability,
        disabilityType: body.hasDisability ? body.disabilityType : null,
        disabilityDetails: body.hasDisability ? body.disabilityDetails : null,

        province: body.province,
        district: body.district,
        sector: body.sector,
        cell: body.cell,
        village: body.village,
        emergencyContactName: body.emergencyContactName,
        emergencyContactRelation: body.emergencyContactRelation,
        emergencyContactPhone: body.emergencyContactPhone,

        hasYoungChild: body.hasYoungChild,
        hasChildcareSupport: body.hasYoungChild ? body.hasChildcareSupport : null,

        hasLaptop: body.hasLaptop,
        currentOccupation: body.currentOccupation,
        occupationDetails: body.occupationDetails,

        educationBackground: body.educationBackground,
        educationDocumentName: educationDocument?.name,
        educationDocument: educationDocument && documentBytes ? {
          create: { name: educationDocument.name, contentType: educationDocument.type, data: documentBytes },
        } : undefined,
        university: body.university,
        academicBackground: body.academicBackground,
        englishProficiency: body.englishProficiency,
        englishSkillConfidence: body.englishSkillConfidence,
        // canPayRegistrationFee: body.canPayRegistrationFee,

        linkedInProfile: body.linkedInProfile,
        githubProfile: body.githubProfile,

        howDidYouKnow: body.howDidYouKnow,
        howDidYouKnowSpecification: body.howDidYouKnowSpecification,
        motivation: body.motivation,
        additionalFeedback: body.additionalFeedback,

        courseId: body.courseId,
        cohortId: body.cohortId || undefined,
    })

    revalidateTag(PROGRAM_CACHE_TAG, { expire: 0 })
    return NextResponse.json({ id: application.id }, { status: 201 })
  } catch (error) {
    if (error instanceof ProgramUnavailableError) return NextResponse.json({ message: error.message, errors: { [error.field]: [error.message] } }, { status: 400 })
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ message: "An application with this email already exists", errors: { email: ["An application with this email already exists"] } }, { status: 400 })
    console.error("Error creating application:", error)
    return NextResponse.json({ message: "Failed to create application" }, { status: 500 })
  }
}
