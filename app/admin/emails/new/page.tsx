import type { Metadata } from "next"
import AdminHeader from "@/components/admin/admin-header"
import BreadcrumbWithCustomSeparator, { BreadCrumLinkTypes } from "@/components/BreadcrumbWithCustomSeparator";
import Link from "next/link";
import EmailForm from "@/components/EmailForm";
import { createEmail, getCourses } from "@/lib/actions";

export const metadata: Metadata = {
    title: "Admin - Create New Email",
    description: "Add new emails",
}

export default async function page() {
    const breadCrumLinks: BreadCrumLinkTypes[] = [
        { label: 'Emails', link: '/admin/emails', position: 'middle' },
        { label: 'Add New', link: '', position: 'end' },
    ];

    const courses = await getCourses();

    return (
        <div className="min-h-screen flex flex-col">
            <AdminHeader />
            <BreadcrumbWithCustomSeparator breadCrumLinks={breadCrumLinks} />
            <main className="flex-1 container mx-auto py-8 px-4">
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-700">Add New Email</h1>
                        <Link className="underline" href={"/admin/emails"}>Go Back to Emails</Link>
                    </div>
                    <p className="text-muted-foreground pt-2">Create a new email for applicants</p>
                    {courses && <EmailForm courses={courses} onSubmit={createEmail} submitButtonText="Create Email" />}
                </div>
            </main>
        </div>
    )
}
