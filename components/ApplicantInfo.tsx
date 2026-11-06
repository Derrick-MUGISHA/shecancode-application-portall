"use client";
import { useAdminPrivacy } from "./admin/privacy-context";
import type { ReactNode } from "react";
import type { AdminApplication } from "@/lib/admin-application-types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ENTRY_SOURCES, isEntrySource } from "@/lib/entry-sources"
import { formatIdentificationNumber } from "@/lib/identity-format"
import ContactLink from "./contact-link";
import EducationDocumentDownload from "./education-document-download";
import styles from "./applicant-info.module.css";

const missing = "Data not available";
const human = (value?: string | null) =>
  value
    ? value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/^./, (letter) => letter.toUpperCase())
    : missing;
const yesNo = (value: boolean | null | undefined) =>
  value == null ? missing : value ? "Yes" : "No";
function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const hidden = useAdminPrivacy();
  return (
    <div className={`${styles.field} ${wide ? styles.wide : ""}`}>
      <dt>{label}</dt>
      <dd>
        {hidden ? (
          <span aria-label="Value hidden">Hidden</span>
        ) : (
          children || missing
        )}
      </dd>
    </div>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className={styles.section}>
      <CardHeader className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
      </CardHeader>
      <CardContent>
        <dl className={styles.fields}>{children}</dl>
      </CardContent>
    </Card>
  );
}
export default function ApplicantInfo({
  application: a,
}: {
  application: AdminApplication;
}) {
  const cohort = a.cohort
    ? `cohort-${a.cohort.number}`
    : a.cohortLabel || a.course?.cohortLabel || missing;
  const birthday = a.dateOfBirth
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Africa/Kigali",
      }).format(new Date(a.dateOfBirth))
    : missing;
  const profile = (value: string | null) =>
    value && /^https?:\/\//i.test(value) ? (
      <a href={value} target="_blank" rel="noopener noreferrer">
        {value}
      </a>
    ) : (
      value || missing
    );
  return (
    <div className={styles.sections}>
      <Section title="Personal Information">
        <Field label="Full Name">{a.fullName}</Field>
        <Field label="Email">
          {<ContactLink value={a.email} kind="email" />}
        </Field>
        <Field label="Date of Birth">{birthday}</Field>
        <Field label="Gender">{human(a.gender)}</Field>
        <Field label="Phone">
          {<ContactLink value={a.phone} kind="phone" />}
        </Field>
        <Field label="Nationality">{a.nationality}</Field>
        <Field label="Refugee Status">{yesNo(a.refugeeStatus)}</Field>
        <Field
          label={a.refugeeStatus ? "Refugee Registration Number" : "ID Number"}
        >
          {a.identificationNumber}
        </Field>
      </Section>
      <Section title="Disability Information">
        <Field label="Has Disability">{yesNo(a.hasDisability)}</Field>
        {a.hasDisability && (
          <>
            <Field label="Disability Type">{human(a.disabilityType)}</Field>
            <Field label="Disability Details" wide>
              {a.disabilityDetails}
            </Field>
          </>
        )}
      </Section>
      <Section title="Contact Information">
        <Field label="Province">{a.province}</Field>
        <Field label="District">{a.district}</Field>
        <Field label="Sector">{a.sector}</Field>
        <Field label="Cell">{a.cell}</Field>
        <Field label="Village">{a.village}</Field>
        <Field label="Emergency Contact">{a.emergencyContactName}</Field>
        <Field label="Relationship">{a.emergencyContactRelation}</Field>
        <Field label="Emergency Phone">
          {<ContactLink value={a.emergencyContactPhone} kind="phone" />}
        </Field>
      </Section>
      <Section title="Family and Equipment">
        <Field label="Has Young Child">{yesNo(a.hasYoungChild)}</Field>
        {a.hasYoungChild && (
          <Field label="Has Childcare Support">
            {yesNo(a.hasChildcareSupport)}
          </Field>
        )}
        <Field label="Has Laptop">{yesNo(a.hasLaptop)}</Field>
      </Section>
      <Section title="Education and Occupation">
        <Field label="Current Occupation">{human(a.currentOccupation)}</Field>
        <Field label="Highest Completed Education">
          {human(a.educationBackground)}
        </Field>
        <Field label="University / Institution">{a.university}</Field>
        <Field label="English Proficiency">{human(a.englishProficiency)}</Field>
        <Field label="Most Confident English Skill">
          {human(a.englishSkillConfidence)}
        </Field>
        <Field label="Current Work, Studies or Activities" wide>
          {a.occupationDetails}
        </Field>
        <Field label="Education Attachment" wide>
          {a.educationDocumentName ? (
            <EducationDocumentDownload
              applicationId={a.id}
              name={a.educationDocumentName}
            />
          ) : (
            missing
          )}
        </Field>
        <Field label="Academic Background" wide>
          {a.academicBackground}
        </Field>
      </Section>
      <Section title="Program and Motivation">
        <Field label="Selected Program">{a.course?.name}</Field>
        <Field label="Cohort">{cohort}</Field>
        <Field label="How They Heard About Us">{human(a.howDidYouKnow)}</Field>
        <Field label="Referral Details">{a.howDidYouKnowSpecification}</Field>
        <Field label="Motivation" wide>
          {a.motivation}
        </Field>
        <Field label="Additional Feedback" wide>
          {a.additionalFeedback}
        </Field>
      </Section>
      <Section title="Application source"><Field label="Website">{a.entrySourceDomain}</Field><Field label="Program page">{a.entrySource && isEntrySource(a.entrySource) ? <a href={ENTRY_SOURCES[a.entrySource].url} target="_blank" rel="noopener noreferrer">{ENTRY_SOURCES[a.entrySource].label}</a> : missing}</Field><Field label="Entry link issued" wide>{a.entryIssuedAt?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Kigali"}).format(new Date(a.entryIssuedAt))+" · Kigali time":missing}</Field></Section>
    <Section title="Professional Profiles">
        <Field label="LinkedIn Profile">{profile(a.linkedInProfile)}</Field>
        <Field label="GitHub Profile">{profile(a.githubProfile)}</Field>
      </Section>
    </div>
  );
}
