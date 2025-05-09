"use server"

import { z } from "zod"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import nodemailer from "nodemailer";

const ApplicationSchema = z.object({
  status: z.enum([
    "UNDER_REVIEW",
    "TECHNICAL_INTERVIEW_SCHEDULED",
    "TECHNICAL_INTERVIEWED",
    "COMMON_INTERVIEW_SCHEDULED",
    "COMMON_INTERVIEWED",
    "ACCEPTED",
    "REJECTED",
    "WAITLISTED",
    "WITHDRAWN",
    "NEEDS_FOLLOW_UP",
  ]),
  reviewerComments: z.string().optional(),
  interviewDate: z.string().optional().nullable(),
  decisionDate: z.string().optional().nullable(),
  technicalInterviewMarks: z.number().min(0).max(100).optional().nullable(),
  sendEmail: z.boolean().optional(),
  selectedEmailId: z.string().optional(),
  modifiedEmail: z
    .object({
      subject: z.string().min(1, "Subject is required").optional(),
      body: z.string().min(1, "Body is required").optional(),
    })
    .optional(),
})

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
})

export async function updateApplication(id: string, formData: FormData) {
  try {
    const data = ApplicationSchema.parse({
      status: formData.get("status"),
      reviewerComments: formData.get("reviewerComments") || undefined,
      interviewDate: formData.get("interviewDate") || undefined,
      decisionDate: formData.get("decisionDate") || undefined,
      technicalInterviewMarks:
        formData.get("technicalInterviewMarks") !== ""
          ? Number(formData.get("technicalInterviewMarks"))
          : undefined,
      sendEmail: formData.get("sendEmail") === "true",
      selectedEmailId: formData.get("selectedEmailId") || undefined,
      modifiedEmail: formData.get("modifiedEmail.subject") || formData.get("modifiedEmail.body")
        ? {
            subject: formData.get("modifiedEmail.subject") || undefined,
            body: formData.get("modifiedEmail.body") || undefined,
          }
        : undefined,
    })

    const application = await prisma.application.update({
      where: { id },
      data: {
        status: data.status,
        reviewerComments: data.reviewerComments,
        interviewDate: data.interviewDate ? new Date(data.interviewDate) : null,
        decisionDate: data.decisionDate ? new Date(data.decisionDate) : null,
        technicalInterviewMarks: data.technicalInterviewMarks,
      },
    })

    if (data.sendEmail && data.selectedEmailId) {
      const email = await prisma.email.findUnique({
        where: { id: data.selectedEmailId },
      })

      if (!email) {
        return { success: false, message: "Selected email not found" }
      }

      const emailContent = data.modifiedEmail || email

      await transporter.sendMail({
        from: process.env.EMAIL_ADDRESS,
        to: application.email,
        cc: process.env.CC_EMAIL_ADDRESS,
        subject: emailContent.subject,
        html: emailContent.body,
      })
    }

    revalidatePath("/admin/applications")
    revalidatePath(`/admin/applications/${id}`)
    return { success: true, message: "Application updated successfully" }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validation failed", errors: error.errors }
    }
    console.error("Error updating application:", error)
    return { success: false, message: "Failed to update application" }
  }
}

const EmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  courseId: z.string().min(1, "Course is required"),
  invitationDate: z.string().optional(),
})

export async function createEmail(formData: FormData) {
  try {
    const data = EmailSchema.parse({
      subject: formData.get("subject"),
      body: formData.get("body"),
      courseId: formData.get("courseId"),
      invitationDate: formData.get("invitationDate"),
    })

    const email = await prisma.email.create({
      data: {
        subject: data.subject,
        body: data.body,
        courseId: data.courseId,
        invitationDate: data.invitationDate ? new Date(data.invitationDate) : undefined,
      },
    })

    revalidatePath("/admin/emails")
    return { success: true, message: "Email created successfully", email }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validation failed", errors: error.errors }
    }
    console.error("Error creating email:", error)
    return { success: false, message: "Failed to create email" }
  }
}

export async function updateEmail(id: string, formData: FormData) {
  try {
    const data = EmailSchema.parse({
      subject: formData.get("subject"),
      body: formData.get("body"),
      courseId: formData.get("courseId"),
      invitationDate: formData.get("invitationDate"),
    })

    const email = await prisma.email.update({
      where: { id },
      data: {
        subject: data.subject,
        body: data.body,
        courseId: data.courseId,
        invitationDate: data.invitationDate ? new Date(data.invitationDate) : null,
      },
    })

    revalidatePath("/admin/emails")
    revalidatePath(`/admin/emails/${id}`)
    return { success: true, message: "Email updated successfully", email }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validation failed", errors: error.errors }
    }
    console.error("Error updating email:", error)
    return { success: false, message: "Failed to update email" }
  }
}

export async function deleteEmail(id: string) {
  try {
    await prisma.email.delete({
      where: { id },
    })

    revalidatePath("/admin/emails")
    return { success: true, message: "Email deleted successfully" }
  } catch (error) {
    console.error("Error deleting email:", error)
    return { success: false, message: "Failed to delete email" }
  }
}

export async function getEmails() {
  try {
    return prisma.email.findMany({
      include: { course: true },
      orderBy: { createdAt: "desc" },
    })
  } catch (error) {
    console.log("Error fetching emails", error);
  }
}

export async function getCourses() {
  try {
    return prisma.course.findMany()
  } catch (error) {
    console.log("Error getting courses");
    
  }
}

export async function getApplicants() {
  try {
    return prisma.application.findMany()
  } catch (error) {
    console.log("Error getting applicants");
    
  }
}

// New action to fetch applications and statistics
export async function fetchApplications() {
  try {
    // Fetch all applications with course data
    const applications = await prisma.application.findMany({
      include: {
        course: {
          select: { id: true, name: true },
        },
      },
    })

    // Compute statistics
    const totalApplicants = applications.length

    // Applicants by status
    const applicantsByStatus = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Applicants by course
    const applicantsByCourse = applications.reduce((acc, app) => {
      const courseName = app.course.name
      acc[courseName] = (acc[courseName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Applicants by status and course
    const applicantsByStatusAndCourse = applications.reduce((acc, app) => {
      const key = `${app.status}__${app.course.name}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Unique courses for filtering
    const uniqueCourses = Array.from(new Set(applications.map((app) => app.course.id))).map((courseId) => {
      const app = applications.find((a) => a.course.id === courseId)
      return {
        id: courseId,
        name: app!.course.name,
      }
    })

    return {
      success: true,
      applications,
      statistics: {
        totalApplicants,
        applicantsByStatus,
        applicantsByCourse,
        applicantsByStatusAndCourse,
        courses: uniqueCourses,
      },
    }
  } catch (error) {
    console.error("Error fetching applications:", error)
    return { success: false, message: "Failed to fetch applications" }
  }
}