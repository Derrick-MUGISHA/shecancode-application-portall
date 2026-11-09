import { applicationFieldsSchema, validateEducationAttachment, validatePersonalIdentity } from "./form-schema"

export const APPLICATION_STEPS = [
  { title: "Open Programs", shortTitle: "Program", description: "Choose the program that feels right for your next chapter.", fields: ["courseId", "cohortId"] },
  { title: "About You", shortTitle: "About you", description: "Introduce yourself and share how we can reach and support you.", fields: ["fullName", "email", "dateOfBirth", "gender", "phone", "nationality", "identificationNumber", "refugeeStatus", "hasDisability", "disabilityType", "disabilityDetails", "province", "district", "sector", "cell", "village", "emergencyContactName", "emergencyContactRelation", "emergencyContactPhone"] },
  { title: "Education & Background", shortTitle: "Background", description: "Tell us about your current activities, completed education and learning needs.", fields: ["hasYoungChild", "hasChildcareSupport", "hasLaptop", "currentOccupation", "occupationDetails", "educationBackground", "university", "academicBackground", "educationDocument", "englishProficiency", "englishSkillConfidence"] },
  { title: "Review & Submit", shortTitle: "Finish", description: "Share your motivation, check your details and send your application.", fields: ["linkedInProfile", "githubProfile", "howDidYouKnow", "howDidYouKnowSpecification", "motivation", "additionalFeedback"] },
] as const

export const applicationStepSchemas = [
  applicationFieldsSchema.pick({ courseId: true, cohortId: true }),
  applicationFieldsSchema.pick({
    fullName: true, email: true, dateOfBirth: true, gender: true, phone: true, nationality: true,
    identificationNumber: true, refugeeStatus: true, hasDisability: true, disabilityType: true,
    disabilityDetails: true, province: true, district: true, sector: true, cell: true, village: true,
    emergencyContactName: true, emergencyContactRelation: true, emergencyContactPhone: true,
  }).superRefine(validatePersonalIdentity),
  applicationFieldsSchema.pick({
    hasYoungChild: true, hasChildcareSupport: true, hasLaptop: true, currentOccupation: true,
    occupationDetails: true, educationBackground: true, university: true, academicBackground: true,
    educationDocument: true, englishProficiency: true, englishSkillConfidence: true,
  }).superRefine(validateEducationAttachment),
  applicationFieldsSchema.pick({
    linkedInProfile: true, githubProfile: true, howDidYouKnow: true, howDidYouKnowSpecification: true,
    motivation: true, additionalFeedback: true,
  }),
]

export function applicationStepForField(field: string) {
  return APPLICATION_STEPS.findIndex(step => (step.fields as readonly string[]).includes(field))
}
