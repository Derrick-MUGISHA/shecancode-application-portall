"use client"

import { useMemo, useState } from "react"
import {
  type ColumnDef, type ColumnFiltersState, type SortingState, type VisibilityState,
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, getFacetedRowModel, getFacetedUniqueValues, useReactTable,
} from "@tanstack/react-table"
import type { Course, Email } from "@prisma/client"
import Link from "next/link"
import { BookOpen, Globe2, Mail, Search, X, ArrowUpDown, ArrowUpRight, Inbox } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { DataTableFacetedFilter } from "./ui/data-table-faceted-filter"
import { DataTableViewOptions } from "./ui/data-table-view-options"
import TablePagination from "./admin/table-pagination"
import styles from "./admin/admin.module.css"
import MetricTrend from "./admin/metric-trend"
import { kigaliDay } from "@/lib/admin-applications"

type EmailRow = Email & { course: Course | null }
interface EmailsTableProps { emails: EmailRow[]; courses: Course[] }
const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Kigali" })
const dateLabel = (value: string | Date | null) => value ? dateFormatter.format(new Date(value)) : "Not set"

export default function EmailsTable({ emails, courses }: EmailsTableProps) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const columns = useMemo<ColumnDef<EmailRow>[]>(() => [
    { id: "number", header: "#", enableHiding: false, enableSorting: false,
      cell: ({ row, table }) => <span className={styles.rowNumber}>{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + table.getRowModel().rows.findIndex(item => item.id === row.id) + 1}</span> },
    {
      accessorKey: "subject", header: "Subject", enableHiding: false,
      cell: ({ row }) => <div className={styles.emailSubject}>
        <span className={styles.emailIcon}><Mail size={17} aria-hidden="true" /></span>
        <Link href={`/admin/emails/${row.original.id}`}>{row.original.subject}</Link>
      </div>,
    },
    {
      id: "program", accessorFn: row => row.course?.name ?? "No program", header: "Program",
      filterFn: (row, id, values: string[]) => !values.length || values.includes(row.getValue(id)),
      cell: ({ row }) => <span className={styles.emailProgram}>{row.original.course?.name ?? "No program assigned"}</span>,
    },
    { accessorKey: "invitationDate", header: "Invitation date", cell: ({ row }) => <span className="whitespace-nowrap">{dateLabel(row.original.invitationDate)}</span> },
    { accessorKey: "createdAt", header: "Created", cell: ({ row }) => <span className="whitespace-nowrap">{dateLabel(row.original.createdAt)}</span> },
    {
      id: "actions", header: "Action", enableHiding: false, enableSorting: false,
      cell: ({ row }) => <Button variant="outline" size="sm" asChild>
        <Link href={`/admin/emails/${row.original.id}`} aria-label={`View email: ${row.original.subject}`}>View<ArrowUpRight size={14} className="ml-1" aria-hidden="true" /></Link>
      </Button>,
    },
  ], [])
  const table = useReactTable({
    data: emails, columns, state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters, onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(), getFacetedUniqueValues: getFacetedUniqueValues(),
  })
  const filteredCount = table.getFilteredRowModel().rows.length
  const { pageIndex, pageSize } = table.getState().pagination
  const programOptions = useMemo(() => {
    const names = new Set([...courses.map(course => course.name), ...emails.map(email => email.course?.name ?? "No program")])
    return [...names].sort((a, b) => a.localeCompare(b)).map(name => ({ label: name, value: name }))
  }, [courses, emails])
  const overview = useMemo(() => {
    const latest = emails.map(email => kigaliDay(email.createdAt).slice(0, 7)).filter(Boolean).sort().at(-1)
    const months = latest ? Array.from({ length: 12 }, (_, index) => {
      const date = new Date(`${latest}-01T00:00:00Z`)
      date.setUTCMonth(date.getUTCMonth() - 11 + index)
      return date.toISOString().slice(0, 7)
    }) : []
    const groups = [
      { label: "All emails", records: emails, note: "Across your admissions workspace", icon: Mail },
      { label: "Program emails", records: emails.filter(email => email.courseId !== null), note: "Assigned to a specific program", icon: BookOpen },
      { label: "General emails", records: emails.filter(email => email.courseId === null), note: "No program assigned", icon: Globe2 },
    ]
    return { months, metrics: groups.map(group => ({ ...group, counts: months.map(month => group.records.filter(email => kigaliDay(email.createdAt).startsWith(month)).length) })) }
  }, [emails])
  return (
    <>
      <section className={`${styles.metrics} ${styles.metricsThree}`} aria-label="Email overview">
        {overview.metrics.map(({ label, records, note, icon: Icon, counts }) => (
          <article key={label} className={`${styles.metric} ${styles.analyticsMetric}`}
            onMouseEnter={() => setHoveredMetric(label)} onMouseLeave={() => setHoveredMetric(null)}>
            <span><Icon size={15} aria-hidden="true" />{label}</span>
            <div className={styles.metricBody}>
              <strong>{records.length.toLocaleString()}</strong>
              <MetricTrend label={label} counts={counts} months={overview.months} active={hoveredMetric === label}
                unit="emails created" context="Creation date · Kigali time" />
            </div>
            <small>{note}</small>
          </article>
        ))}
      </section>
    <section className={styles.recordsSection} aria-labelledby="emails-table-heading">
      <div className={styles.tableHeader}>
        <div>
          <h2 id="emails-table-heading" className="flex items-center gap-2">All emails<span className={styles.recordCount}>{emails.length.toLocaleString()}</span></h2>
          <p className={styles.note}>Reusable messages for application reviews and invitations.</p>
        </div>
      </div>
      <div className={styles.emailFilters}>
        <label className={styles.emailSearch}>
          <span className="sr-only">Search email subjects</span><Search size={16} aria-hidden="true" />
          <Input type="search" placeholder="Search email subjects…" value={(table.getColumn("subject")?.getFilterValue() as string) ?? ""}
            onChange={event => table.getColumn("subject")?.setFilterValue(event.target.value)} />
        </label>
        <DataTableFacetedFilter column={table.getColumn("program")} title="Program" options={programOptions} />
        <DataTableViewOptions table={table} />
        {columnFilters.length > 0 && <Button variant="ghost" size="sm" onClick={() => table.resetColumnFilters()}><X size={14} className="mr-1" aria-hidden="true" />Clear filters</Button>}
      </div>
      <div className={`${styles.tableScroll} ${styles.emailTable}`}>
        <Table>
          <TableHeader>{table.getHeaderGroups().map(group => <TableRow key={group.id}>
            {group.headers.map(header => <TableHead key={header.id} className={header.column.id === "actions" ? "text-right" : undefined}
              aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : undefined}>
              {header.column.getCanSort() ? <button type="button" className={styles.emailSort} onClick={header.column.getToggleSortingHandler()}>
                {flexRender(header.column.columnDef.header, header.getContext())}<ArrowUpDown size={13} aria-hidden="true" />
              </button> : flexRender(header.column.columnDef.header, header.getContext())}
            </TableHead>)}
          </TableRow>)}</TableHeader>
          <TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map(row => <TableRow key={row.id}>
            {row.getVisibleCells().map(cell => <TableCell key={cell.id} className={cell.column.id === "actions" ? "text-right" : undefined}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
          </TableRow>) : <TableRow><TableCell colSpan={table.getVisibleLeafColumns().length}>
            <div className={styles.empty}><Inbox size={28} aria-hidden="true" /><strong>{emails.length ? "No matching emails" : "No emails yet"}</strong>
              <p>{emails.length ? "Try another subject or program." : "Add your first email to use during application reviews."}</p>
              {emails.length > 0 ? <Button variant="outline" size="sm" onClick={() => table.resetColumnFilters()}>Clear filters</Button>
                : <Button size="sm" asChild><Link href="/admin/emails/new">Add email</Link></Button>}
            </div>
          </TableCell></TableRow>}</TableBody>
        </Table>
      </div>
      <TablePagination page={pageIndex + 1} pageSize={pageSize} total={filteredCount} noun="emails" ariaLabel="Emails pagination"
        filtered={columnFilters.length > 0} onPageChange={page => table.setPageIndex(page - 1)}
        onPageSizeChange={size => { table.setPageSize(size); table.setPageIndex(0) }} />
    </section>
    </>
  )
}
