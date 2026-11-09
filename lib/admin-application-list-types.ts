export type Application = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  cohort?: { id: string; number: number; isOpen?: boolean; capacity?: number | null; closesAt?: Date | string | null; _count?: { applications: number } } | null;
  cohortLabel?: string | null;
  entrySourceDomain?: string | null;
  createdAt: string | Date;
  course: {
    id: string;
    name: string;
    cohortLabel?: string | null;
    isOpen?: boolean;
  } | null;
};

type Course = {
  id: string;
  name: string;
};

type Statistics = {
  totalApplicants: number;
  applicantsByStatus: Record<string, number>;
  applicantsByCourse: Record<string, number>;
  applicantsByStatusAndCourse: Record<string, number>;
  courses: Course[];
};

export type ApplicationsResult =
  | { success: true; applications: Application[]; statistics: Statistics }
  | { success: false; message: string };

