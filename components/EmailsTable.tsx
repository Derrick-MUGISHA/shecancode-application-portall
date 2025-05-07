"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Course, Email } from "@prisma/client"
import { format } from "date-fns"
import Link from "next/link"
import { DataTable } from "./ui/data-table"

interface EmailsTableProps {
  emails: (Email & { course: Course })[]
  courses: Course[]
}

export default function EmailsTable({ emails, courses }: EmailsTableProps) {
  const columns: ColumnDef<Email & { course: Course }>[] = [
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <Link href={`/admin/emails/${row.original.id}`} className="underline">
          {row.original.subject}
        </Link>
      ),
    },
    {
      accessorKey: "course.name",
      header: "Course",
    },
    {
      accessorKey: "invitationDate",
      header: "Invitation Date",
      cell: ({ row }) =>
        row.original.invitationDate
          ? format(new Date(row.original.invitationDate), "PPP")
          : "-",
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => format(new Date(row.original.createdAt), "PPP"),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={emails}
      searchKey="subject"
      filters={[
        {
          column: "course.name",
          title: "Course",
          options: courses.map((course) => ({
            label: course.name,
            value: course.name,
          })),
        },
      ]}
    />
  )
}