"use client"

import type { Application, Course } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"

interface ApplicantInfoProps {
  application: Application & { course: Course }
}

export default function ApplicantInfo({ application }: ApplicantInfoProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
              <p className="text-base">{application.fullName}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
              <p className="text-base">{application.email}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Date of Birth</h3>
              <p className="text-base">{format(new Date(application.dateOfBirth), "PPP")}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Gender</h3>
              <p className="text-base">{application.gender.replace(/_/g, " ")}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
              <p className="text-base">{application.phone}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Nationality</h3>
              <p className="text-base">{application.nationality}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Refugee Status</h3>
              <p className="text-base">{application.refugeeStatus ? "Yes" : "No"}</p>
            </div>
            {application.refugeeStatus && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Refugee ID</h3>
                <p className="text-base">{application.refugeeId}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disability Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Has Disability</h3>
            <p className="text-base">{application.hasDisability ? "Yes" : "No"}</p>
          </div>
          {application.hasDisability && (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Disability Type</h3>
                <p className="text-base">{application.disabilityType?.replace(/_/g, " ")}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Disability Details</h3>
                <p className="text-base">{application.disabilityDetails || "Not provided"}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Province</h3>
            <p className="text-base">{application.province}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">District</h3>
            <p className="text-base">{application.district}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Sector</h3>
            <p className="text-base">{application.sector}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Cell</h3>
            <p className="text-base">{application.cell}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Village</h3>
            <p className="text-base">{application.village}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Emergency Contact</h3>
              <p className="text-base">{application.emergencyContactName}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Relationship</h3>
              <p className="text-base">{application.emergencyContactRelation}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Emergency Phone</h3>
              <p className="text-base">{application.emergencyContactPhone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Family and Equipment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Has Young Child</h3>
              <p className="text-base">{application.hasYoungChild ? "Yes" : "No"}</p>
            </div>
            {application.hasYoungChild && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Has Childcare Support</h3>
                <p className="text-base">{application.hasChildcareSupport ? "Yes" : "No"}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Has Laptop</h3>
              <p className="text-base">{application.hasLaptop ? "Yes" : "No"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Education and Occupation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Current Occupation</h3>
              <p className="text-base">{application.currentOccupation.replace(/_/g, " ")}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Education Background</h3>
              <p className="text-base">{application.educationBackground.replace(/_/g, " ")}</p>
            </div>
            {application.university && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">University/Institution</h3>
                <p className="text-base">{application.university}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">English Proficiency</h3>
              <p className="text-base">{application.englishProficiency}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Most Confident English Skill</h3>
              <p className="text-base">{application.englishSkillConfidence}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Can Pay Registration Fee</h3>
              <p className="text-base">{application.canPayRegistrationFee ? "Yes" : "No"}</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Academic Background</h3>
            <p className="text-base">{application.academicBackground}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Course and Motivation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Selected Course</h3>
            <p className="text-base">{application.course.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">How They Heard About Us</h3>
            <p className="text-base">{application.howDidYouKnow}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">How They Heard About Us (Details)</h3>
            <p className="text-base">{application.howDidYouKnowSpecification || "Not provided"}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Motivation</h3>
            <p className="text-base whitespace-pre-line">{application.motivation}</p>
          </div>
          {application.additionalFeedback && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Additional Feedback</h3>
              <p className="text-base whitespace-pre-line">{application.additionalFeedback}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Professional Profiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {application.linkedInProfile && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">LinkedIn Profile</h3>
                <a
                  href={application.linkedInProfile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {application.linkedInProfile}
                </a>
              </div>
            )}
            {application.githubProfile && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">GitHub Profile</h3>
                <a
                  href={application.githubProfile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {application.githubProfile}
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
