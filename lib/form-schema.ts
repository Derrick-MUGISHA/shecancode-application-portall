import { z } from "zod"
import { identificationNumberError, normalizeIdentificationNumber, normalizeEmailAddress } from "./identity-format"
import { normalizePhoneNumber, isValidPhoneNumber } from "./phone"
import { educationDocumentError } from "./education-document"

export const applicationFieldsSchema = z.object({
  fullName: z.string().trim().max(150).min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().transform(normalizeEmailAddress).pipe(z.string().email({ message: "Please enter a valid email address." })),
  dateOfBirth: z.date({
    message: "Date of birth is required.",
  }).refine(date => date.getTime() <= Date.now(), "Date of birth cannot be in the future."),
  gender: z.enum(["MALE", "FEMALE",], {
    message: "Please select a gender.",
  }),
  phone: z.string().transform(normalizePhoneNumber).refine(isValidPhoneNumber, "Enter a valid phone number, including the country code for numbers outside Rwanda."),
  nationality: z.string().min(2, { message: "Nationality is required." }),
  identificationNumber: z.string().trim().min(1, "Please enter your ID or refugee registration number.").max(80, "The number must be 80 characters or fewer."),
  refugeeStatus: z.boolean(),
  hasDisability: z.boolean(),
  disabilityType: z
    .enum([
      "PHYSICAL_IMPAIRMENT",
      "VISUAL_IMPAIRMENT",
      "HEARING_IMPAIRMENT",
      "MENTAL_IMPAIRMENT",
      "SHORT_STATURE",
      "ALBINISM",
      "DEAF_BLIND",
      "AUTISM",
      "MULTIPLE_DISABILITIES",
    ])
    .optional(),
  disabilityDetails: z.string().optional(),

  province: z.string().min(2, { message: "province is required." }),
  district: z.string().min(2, { message: "district is required." }),
  sector: z.string().min(2, { message: "sector is required." }),
  cell: z.string().min(2, { message: "cell is required." }),
  village: z.string().min(2, { message: "village is required." }),
  emergencyContactName: z.string().min(2, { message: "Emergency contact name is required." }),
  emergencyContactRelation: z.string().min(2, { message: "Relationship is required." }),
  emergencyContactPhone: z.string().transform(normalizePhoneNumber).refine(isValidPhoneNumber, "Enter a valid emergency phone number."),

  hasYoungChild: z.boolean(),
  hasChildcareSupport: z.boolean().optional(),

  hasLaptop: z.boolean(),
  currentOccupation: z.enum(
    [
      "EMPLOYED",
      "ATTENDING_UNIVERSITY_NOT_EMPLOYED",
      "EMPLOYED_ATTENDING_UNIVERSITY",
      "ATTENDING_ADVANCED_TRAINING_AND_UNIVERSITY",
      "NOT_EMPLOYED_NOT_IN_SCHOOL_NOT_IN_ANY_TRAINING",
      "INTERNSHIP",
    ],
    {
      message: "Please select your current occupation.",
    },
  ),

  occupationDetails: z.string().trim().min(2, "Please describe what you are currently doing.").max(2000),

  educationDocument: z.custom<File>((value) => typeof File !== "undefined" && value instanceof File, "Please choose an education attachment.").optional(),

  educationBackground: z.enum(
    [
      "NO_FORMAL_EDUCATION",
      "PRIMARY_SCHOOL",
      "DIPLOMA",
      "HIGH_SCHOOL",
      "TECHNICAL_SCHOOL",
      "YEAR_1_UNIVERSITY",
      "YEAR_2_UNIVERSITY",
      "YEAR_3_UNIVERSITY",
      "YEAR_4_UNIVERSITY",
      "FINAL_YEAR_UNIVERSITY",
      "BACHELORS",
      "MASTERS",
      "PHD",
      "OTHER",
    ],
    {
      message: "Please select your education background.",
    },
  ),
  university: z.string().optional(),
  academicBackground: z.string().min(2, { message: "Academic background is required." }),
  englishProficiency: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "FLUENT", "NATIVE"], {
    message: "Please select your English proficiency.",
  }),
  englishSkillConfidence: z.enum(["READING", "WRITING", "SPEAKING", "LISTENING"], {
    message: "Please select your most confident English skill.",
  }),
  //removed the registration fee question for now, can add it back later if needed
  // canPayRegistrationFee: z.boolean({
  //   message: "Please indicate if you can pay the registration fee.",
  // }),

  linkedInProfile: z.string().url({ message: "Please enter a valid LinkedIn URL." }).optional().or(z.literal("")),
  githubProfile: z.string().url({ message: "Please enter a valid GitHub URL." }).optional().or(z.literal("")),

  howDidYouKnow: z.enum(
    ["SOCIAL_MEDIA", "SHE_CAN_CODE_AMBASSADOR","FRIENDS", "ALUMNI", "WEBSITE", "SCHOOL", "NEWSPAPER", "RADIO", "TV", "EVENT", "OTHER"],
    {
      message: "Please select how you heard about us.",
    },
  ),
  howDidYouKnowSpecification: z.string().optional(),
  motivation: z.string().min(50, { message: "Motivation must be at least 50 characters." }),
  additionalFeedback: z.string().optional(),

  cohortId: z.string().optional(),
  courseId: z.string({
    message: "Please select a course.",
  }).min(1, "Please select a program."),
})

export function validateEducationAttachment(data: { educationDocument?: File; educationBackground: string }, ctx: z.RefinementCtx) {
  if (!data.educationDocument && data.educationBackground !== "NO_FORMAL_EDUCATION") {
    ctx.addIssue({ code: "custom", path: ["educationDocument"], message: "Please attach your certificate, diploma or latest transcript." })
  }
  if (data.educationDocument) {
    const message = educationDocumentError(data.educationDocument)
    if (message) ctx.addIssue({ code: "custom", path: ["educationDocument"], message })
  }
}

export function validatePersonalIdentity(data: { identificationNumber: string; nationality: string; refugeeStatus: boolean }, ctx: z.RefinementCtx) {
  const message = identificationNumberError(data.identificationNumber, data.nationality, data.refugeeStatus)
  if (message) ctx.addIssue({ code: "custom", path: ["identificationNumber"], message })
}

export const formSchema = applicationFieldsSchema.superRefine(validatePersonalIdentity).superRefine(validateEducationAttachment)
  .transform(data => ({ ...data, identificationNumber: normalizeIdentificationNumber(data.identificationNumber, data.nationality, data.refugeeStatus) }))
