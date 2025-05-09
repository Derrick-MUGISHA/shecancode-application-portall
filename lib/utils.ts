import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as xlsx from "xlsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function generateDownloadExcel(applications, statusFilter) {
  const excelData = applications.map(app => ({
    'Full Name': app.fullName,
    'Email': app.email,
    'Date of Birth': app.dateOfBirth ? new Date(app.dateOfBirth) : null,
    'Gender': app.gender,
    'Phone': app.phone,
    'Province': app.province,
    'District': app.district,
    'Sector': app.sector,
    'Cell': app.cell,
    'Village': app.village,
    'Nationality': app.nationality,
    'Refugee Status': app.refugeeStatus ? 'Yes' : 'No',
    'Refugee ID': app.refugeeId,
    'National ID': app.nationalId,
    'Has Disability': app.hasDisability ? 'Yes' : 'No',
    'Disability Type': app.disabilityType,
    'Disability Details': app.disabilityDetails,
    'Emergency Contact Name': app.emergencyContactName,
    'Emergency Contact Relation': app.emergencyContactRelation,
    'Emergency Contact Phone': app.emergencyContactPhone,
    'Has Young Child': app.hasYoungChild ? 'Yes' : 'No',
    'Has Childcare Support': app.hasChildcareSupport ? 'Yes' : 'No',
    'Has Laptop': app.hasLaptop ? 'Yes' : 'No',
    'Current Occupation': app.currentOccupation,
    'Education Background': app.educationBackground,
    'University': app.university,
    'Academic Background': app.academicBackground,
    'English Proficiency': app.englishProficiency,
    'LinkedIn Profile': app.linkedInProfile,
    'GitHub Profile': app.githubProfile,
    'How Did You Know': app.howDidYouKnow,
    'How Did You Know Specification': app.howDidYouKnowSpecification,
    'Motivation': app.motivation,
    'Additional Feedback': app.additionalFeedback,
    'Status': app.status.replace(/_/g, " "),
    'Reviewer Comments': app.reviewerComments,
    'Interview Date': app.interviewDate ? new Date(app.interviewDate) : null,
    'Decision Date': app.decisionDate ? new Date(app.decisionDate) : null,
    'Technical Interview Marks': app.technicalInterviewMarks,
    'Course Name': app.course.name,
  }));

  const ws = xlsx.utils.json_to_sheet(excelData);

  const colWidths = Object.keys(excelData[0]).map((key, index) => {
    const maxLength = Math.max(
        key.length, // Header length
        ...excelData.map(row => (row[key] ? String(row[key]).length : 0))
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  ws['!cols'] = colWidths;


  const longTextFields = ['Motivation', 'Additional Feedback', 'Reviewer Comments', 'Disability Details'];
  const range = xlsx.utils.decode_range(ws['!ref']);
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = xlsx.utils.encode_cell({r: row, c: col});
      const header = Object.keys(excelData[0])[col];
      if (longTextFields.includes(header)) {
        if (!ws[cellAddress]) ws[cellAddress] = {};
        ws[cellAddress].s = {alignment: {wrapText: true}};
      }
    }
  }

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Applications");
  const wbout = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `applications-${statusFilter}-${new Date().toISOString().replace(/T/, '_').replace(/Z/, '').replace(/[-:]/g, '')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

}