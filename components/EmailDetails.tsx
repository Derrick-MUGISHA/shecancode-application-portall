"use client"

import { Course, Email } from "@prisma/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { deleteEmail, updateEmail } from "@/lib/actions"
import EmailForm from "./EmailForm"
import DOMPurify from "isomorphic-dompurify"

interface EmailDetailsProps {
    email: Email & { course: Course }
    courses: Course[]
}

export default function EmailDetails({ email, courses }: EmailDetailsProps) {
    const { toast } = useToast()
    const router = useRouter()

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this email?")) {
            const result = await deleteEmail(email.id)

            toast({
                title: result.success ? "Success" : "Error",
                description: result.message,
                variant: result.success ? "default" : "destructive",
            })

            if (result.success) {
                router.push("/admin/emails")
            }
        }
    }

    // Sanitize the HTML content to prevent XSS
    const sanitizedBody = DOMPurify.sanitize(email.body)

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-gray-700">Email Details</h1>
                <Button variant="destructive" onClick={handleDelete}>
                    Delete Email
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Current Email Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div>
                        <strong className="text-gray-700">Subject:</strong>
                        <p className="text-gray-900">{email.subject}</p>
                    </div>
                    <div>
                        <strong className="text-gray-700">Course:</strong>
                        <p className="text-gray-900">{email.course.name}</p>
                    </div>
                    <div>
                        <strong className="text-gray-700">Body:</strong>
                        <div
                            className="prose prose-sm max-w-none mt-2 p-4 bg-gray-50 rounded-md border border-gray-200"
                            dangerouslySetInnerHTML={{ __html: sanitizedBody }}
                        />
                    </div>
                    <div>
                        <strong className="text-gray-700">Invitation Date:</strong>
                        <p className="text-gray-900">
                            {email.invitationDate ? format(new Date(email.invitationDate), "PPP") : "-"}
                        </p>
                    </div>
                    <div>
                        <strong className="text-gray-700">Created At:</strong>
                        <p className="text-gray-900">{format(new Date(email.createdAt), "PPP")}</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Update Email</CardTitle>
                </CardHeader>
                <CardContent>
                    <EmailForm
                        courses={courses}
                        defaultValues={{
                            subject: email.subject,
                            body: email.body,
                            courseId: email.courseId,
                            invitationDate: email.invitationDate ? new Date(email.invitationDate).toISOString().split("T")[0] : "",
                        }}
                        onSubmit={(formData) => updateEmail(email.id, formData)}
                        submitButtonText="Update Email"
                    />
                </CardContent>
            </Card>
        </div>
    )
}