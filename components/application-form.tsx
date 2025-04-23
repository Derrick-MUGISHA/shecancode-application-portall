"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { formSchema } from "@/lib/form-schema";
import CourseSelection from "@/components/form-sections/course-selection";
import PersonalInformation from "@/components/form-sections/personal-information";
import DisabilityInformation from "@/components/form-sections/disability-information";
import ContactInformation from "@/components/form-sections/contact-information";
import FamilyEquipment from "@/components/form-sections/family-equipment";
import EducationOccupation from "@/components/form-sections/education-occupation";
import AdditionalInformation from "@/components/form-sections/additional-information";

type FormValues = z.infer<typeof formSchema>;

type Course = {
  id: string;
  name: string;
  description: string | null;
};

export default function ApplicationForm() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch courses from the API
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch("/api/courses");
        if (!response.ok) {
          throw new Error("Failed to fetch courses");
        }
        const data = await response.json();
        setCourses(data);
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast({
          title: "Error",
          description: "Failed to load courses. Please try again later.",
          variant: "destructive",
        });
      }
    };

    fetchCourses();
  }, []);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      nationality: "",
      refugeeStatus: false,
      hasDisability: false,
      residence: "",
      emergencyContactName: "",
      emergencyContactRelation: "",
      emergencyContactPhone: "",
      hasYoungChild: false,
      hasLaptop: false,
      academicBackground: "",
      howDidYouKnow: "SOCIAL_MEDIA",
      motivation: "",
      linkedInProfile: "",
      githubProfile: "",
      nationalId: "",
    },
  });

  // Handle form submission
  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400) {
          // If the error message contains a field name, set the error for that field
          if (responseData.message.includes("is required")) {
            const fieldName = responseData.message.split(" is required")[0];
            form.setError(fieldName as any, {
              type: "server",
              message: responseData.message,
            });
          } else if (responseData.message.includes("email already exists")) {
            form.setError("email", {
              type: "server",
              message: "An application with this email already exists",
            });
            setFormError("An application with this email already exists");
          } else {
            // For other validation errors, show a toast
            toast({
              title: "Validation Error",
              description: responseData.message,
              variant: "destructive",
            });
          }
        } else {
          throw new Error(
            responseData.message || "Failed to submit application"
          );
        }
        return;
      }

      // Clear form data from localStorage after successful submission
      localStorage.removeItem("applicationFormData");

      toast({
        title: "Application Submitted",
        description: "Your application has been successfully submitted.",
      });

      // Redirect to success page or home
      router.push("/apply/success");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Load form data from localStorage when component mounts
  useEffect(() => {
    const savedFormData = localStorage.getItem("applicationFormData");
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);

        // Handle date fields specifically
        if (parsedData.dateOfBirth) {
          parsedData.dateOfBirth = new Date(parsedData.dateOfBirth);
        }
        if (parsedData.interviewDate) {
          parsedData.interviewDate = parsedData.interviewDate
            ? new Date(parsedData.interviewDate)
            : null;
        }
        if (parsedData.decisionDate) {
          parsedData.decisionDate = parsedData.decisionDate
            ? new Date(parsedData.decisionDate)
            : null;
        }

        // Reset form with saved data
        form.reset(parsedData);

        toast({
          title: "Form Data Restored",
          description: "Your previously entered information has been loaded.",
        });
      } catch (error) {
        console.error("Error parsing saved form data:", error);
      }
    }
  }, [form]);

  // Save form data to localStorage when values change
  useEffect(() => {
    const subscription = form.watch((values) => {
      // Don't save if form is empty (initial load)
      if (values.fullName || values.email) {
        localStorage.setItem("applicationFormData", JSON.stringify(values));
      }
    });

    return () => subscription.unsubscribe();
  }, [form.watch]);

  return (
    <Card>
      <CardContent className="pt-6 bg-white">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Course Selection - Moved to top */}
            <CourseSelection form={form} courses={courses} />

            {/* Personal Information Section */}
            <PersonalInformation form={form} />

            {/* Disability Information */}
            <DisabilityInformation form={form} />

            {/* Contact Information */}
            <ContactInformation form={form} />

            {/* Family and Equipment */}
            <FamilyEquipment form={form} />

            {/* Education and Occupation */}
            <EducationOccupation form={form} />

            {/* Additional Information */}
            <AdditionalInformation form={form} />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
            {formError && (
              <p className="text-sm text-red-600 text-center mt-2">
                {formError}
              </p>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
