import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

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
    const body = await request.json()

    // Validate required fields
    const requiredFields = [
      "fullName",
      "email",
      "dateOfBirth",
      "gender",
      "phone",
      "nationality",
      "province",
      "district",
      "sector",
      "cell",
      "village",
      "emergencyContactName",
      "emergencyContactRelation",
      "emergencyContactPhone",
      "currentOccupation",
      "educationBackground",
      "academicBackground",
      "englishProficiency",
      "howDidYouKnow",
      "motivation",
      "courseId",
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        console.log(`Missing required field: ${field}`)
        return NextResponse.json({ message: `${field} is required` }, { status: 400 })
      }
    }

    // Check if email already exists
    const existingApplication = await prisma.application.findUnique({
      where: {
        email: body.email,
      },
    })

    if (existingApplication) {
      return NextResponse.json({ message: "An application with this email already exists" }, { status: 400 })
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: {
        id: body.courseId,
      },
    })

    if (!course) {
      return NextResponse.json({ message: "Selected course does not exist" }, { status: 400 })
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        dateOfBirth: new Date(body.dateOfBirth),
        gender: body.gender,
        phone: body.phone,
        nationality: body.nationality,
        refugeeStatus: body.refugeeStatus,
        refugeeId: body.refugeeId,
        nationalId: body.nationalId,

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

        educationBackground: body.educationBackground,
        university: body.university,
        academicBackground: body.academicBackground,
        englishProficiency: body.englishProficiency,

        linkedInProfile: body.linkedInProfile,
        githubProfile: body.githubProfile,

        howDidYouKnow: body.howDidYouKnow,
        howDidYouKnowSpecification: body.howDidYouKnowSpecification,
        motivation: body.motivation,
        additionalFeedback: body.additionalFeedback,

        courseId: body.courseId,
      },
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error("Error creating application:", error)
    return NextResponse.json({ message: "Failed to create application" }, { status: 500 })
  }
}
