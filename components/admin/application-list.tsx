"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  filterAdminApplications,
  paginateAdminRows,
  cohortOf,
  cohortName,
  kigaliDay,
  DEFAULT_ADMIN_FILTERS,
  type AdminFilters,
} from "@/lib/admin-applications";
import { kigaliDateTimeInput } from "@/lib/program-availability";
import AdminSelect from "./admin-select";
import AdminDatePicker from "./admin-date-picker";
import ApplicationAnalytics from "./application-analytics";
import styles from "./admin.module.css";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { fetchApplications, updateApplicationStatuses } from "@/lib/actions";
import { generateDownloadExcel } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Application = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  cohort?: { id: string; number: number } | null;
  cohortLabel?: string | null;
  createdAt: string | Date;
  course: {
    id: string;
    name: string;
    cohortLabel?: string | null;
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

type ApplicationsResult =
  | { success: true; applications: Application[]; statistics: Statistics }
  | { success: false; message: string };

const statusColors: Record<string, string> = {
  UNDER_REVIEW:
    "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 py-2 shadow-md border border-gray-200",
  TECHNICAL_INTERVIEW_SCHEDULED:
    "bg-blue-100 text-blue-800 hover:bg-blue-200 py-2 shadow-md border border-gray-200",
  TECHNICAL_INTERVIEWED:
    "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 py-2 shadow-md border border-gray-200",
  COMMON_INTERVIEW_SCHEDULED:
    "bg-purple-100 text-purple-800 hover:bg-purple-200 py-2 shadow-md border border-gray-200",
  COMMON_INTERVIEWED:
    "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200 py-2 shadow-md border border-gray-200",
  ACCEPTED:
    "bg-green-100 text-green-800 hover:bg-green-200 py-2 shadow-md border border-gray-200",
  REJECTED:
    "bg-red-100 text-red-800 hover:bg-red-200 py-2 shadow-md border border-gray-200",
  WAITLISTED:
    "bg-orange-100 text-orange-800 hover:bg-orange-200 py-2 shadow-md border border-gray-200",
  WITHDRAWN:
    "bg-gray-100 text-gray-800 hover:bg-gray-200 py-2 shadow-md border border-gray-200",
  NEEDS_FOLLOW_UP:
    "bg-pink-100 text-pink-800 hover:bg-pink-200 py-2 shadow-md border border-gray-200",
};

const applicationStatuses = [
  { value: "UNDER_REVIEW", label: "Under Review" },
  {
    value: "TECHNICAL_INTERVIEW_SCHEDULED",
    label: "Technical Interview Scheduled",
  },
  { value: "TECHNICAL_INTERVIEWED", label: "Technical Interviewed" },
  { value: "COMMON_INTERVIEW_SCHEDULED", label: "Common Interview Scheduled" },
  { value: "COMMON_INTERVIEWED", label: "Common Interviewed" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WAITLISTED", label: "Waitlisted" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "NEEDS_FOLLOW_UP", label: "Needs Follow-up" },
];

export default function ApplicationList({
  initialData,
  initialFilters,
}: {
  initialData: ApplicationsResult;
  initialFilters: Partial<AdminFilters> & { page?: number; pageSize?: number };
}) {
  const [applications, setApplications] = useState<Application[]>(
    initialData.success ? initialData.applications : [],
  );
  const [filters, setFilters] = useState<AdminFilters>({
    ...DEFAULT_ADMIN_FILTERS,
    ...initialFilters,
  });
  const [page, setPage] = useState(initialFilters.page || 1);
  const [pageSize, setPageSize] = useState(initialFilters.pageSize || 25);
  const [loading, setLoading] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [error, setError] = useState<string | null>(
    initialData.success ? null : initialData.message,
  );
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<
    string[]
  >([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const { toast } = useToast();
  const filtered = useMemo(
    () => filterAdminApplications(applications, filters),
    [applications, filters],
  );
  const pagination = paginateAdminRows(filtered, page, pageSize);
  const cohorts = useMemo(
    () =>
      Array.from(
        new Set(
          applications
            .filter(
              (row) =>
                filters.course === "ALL" || row.course?.id === filters.course,
            )
            .map(cohortOf),
        ),
      ).sort((a, b) => a.localeCompare(b, "en", { numeric: true })),
    [applications, filters.course],
  );
  const years = useMemo(
    () =>
      Array.from(
        new Set(
          applications
            .map((row) => kigaliDay(row.createdAt).slice(0, 4))
            .filter(Boolean),
        ),
      )
        .sort()
        .reverse(),
    [applications],
  );
  const courses = useMemo(
    () =>
      Array.from(
        new Map(
          applications
            .filter((row) => row.course)
            .map((row) => [row.course!.id, row.course!]),
        ).values(),
      ).sort((a, b) => a.name.localeCompare(b.name)),
    [applications],
  );
  const visibleIds = pagination.rows.map((row) => row.id);
  const selectedVisible = visibleIds.filter((id) =>
    selectedApplicationIds.includes(id),
  ).length;
  const allSelected =
    visibleIds.length > 0 && selectedVisible === visibleIds.length;
  const selectedNeedingChange = applications.filter(
    (row) =>
      selectedApplicationIds.includes(row.id) && row.status !== bulkStatus,
  ).length;
  const updateFilter = (key: keyof AdminFilters, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "course" ? { cohort: "ALL" } : {}),
    }));
    setPage(1);
    setSelectedApplicationIds([]);
  };
  const listHref = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of Object.keys(
      DEFAULT_ADMIN_FILTERS,
    ) as (keyof AdminFilters)[])
      if (filters[key] !== DEFAULT_ADMIN_FILTERS[key])
        params.set(key, filters[key]);
    if (pagination.page > 1) params.set("page", String(pagination.page));
    if (pagination.size !== 25) params.set("pageSize", String(pagination.size));
    return `/admin/applications${params.size ? "?" + params.toString() : ""}`;
  }, [filters, pagination.page, pagination.size]);
  useEffect(() => {
    window.history.replaceState(null, "", listHref);
  }, [listHref]);
  useEffect(() => {
    setSelectedApplicationIds((current) =>
      current.filter((id) => applications.some((row) => row.id === id)),
    );
  }, [applications]);
  const lastRefresh = useRef(Date.now());
  const refreshActive = useRef(false);
  const refresh = async () => {
    if (refreshActive.current) return;
    refreshActive.current = true;
    lastRefresh.current = Date.now();
    setLoading(true);
    try {
      const result = await fetchApplications();
      if (result.success) {
        setApplications(result.applications);
        setError(null);
      } else setError(result.message);
    } catch {
      setError("Unable to refresh applications. Please try again.");
    } finally {
      refreshActive.current = false;
      setLoading(false);
    }
  };
  useEffect(() => {
    const refreshInBackground = () => {
      if (
        document.visibilityState === "visible" &&
        !isBulkUpdating &&
        Date.now() - lastRefresh.current >= 30000
      )
        void refresh();
    };
    const timer = setInterval(refreshInBackground, 30000);
    window.addEventListener("focus", refreshInBackground);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshInBackground);
    };
  }, [isBulkUpdating]);
  const toggle = (id: string, checked: boolean) =>
    setSelectedApplicationIds((current) =>
      checked
        ? Array.from(new Set([...current, id]))
        : current.filter((value) => value !== id),
    );
  const togglePage = (checked: boolean) =>
    setSelectedApplicationIds((current) =>
      checked
        ? Array.from(new Set([...current, ...visibleIds]))
        : current.filter((id) => !visibleIds.includes(id)),
    );
  const bulkUpdate = async () => {
    if (!selectedApplicationIds.length || !bulkStatus) return;
    setIsBulkUpdating(true);
    try {
      const result = await updateApplicationStatuses(
        selectedApplicationIds,
        bulkStatus,
      );
      toast({
        title: result.success ? "Updated" : "Unable to update",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      if (result.success) {
        setSelectedApplicationIds([]);
        setBulkStatus("");
        await refresh();
      }
    } catch {
      toast({
        title: "Unable to update",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };
  const selectFilter = (
    key: keyof AdminFilters,
    label: string,
    options: { value: string; label: string }[],
  ) => (
    <AdminSelect
      label={label}
      value={filters[key]}
      onChange={(value) => updateFilter(key, value)}
      options={options}
    />
  );
  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <div>
          <h1>Applications</h1>
          <p>
            Review applicants, compare cohorts, and follow every application.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw
            size={15}
            className={loading ? "mr-2 animate-spin" : "mr-2"}
          />
          Refresh
        </Button>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}{" "}
          <Button variant="outline" onClick={refresh}>
            Try again
          </Button>
        </div>
      )}
      <section className={styles.toolbar} aria-label="Application filters">
        <div className={styles.filters}>
          <label className={styles.filter}>
            Search applicants
            <Input
              type="search"
              placeholder="Name or email"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </label>
          {selectFilter("course", "Program", [
            { value: "ALL", label: "All programs" },
            ...courses.map((course) => ({
              value: course.id,
              label: course.name,
            })),
            ...(applications.some((row) => !row.course)
              ? [{ value: "unknown", label: "Data not available" }]
              : []),
          ])}
          {selectFilter("cohort", "Cohort", [
            { value: "ALL", label: "All cohorts" },
            ...cohorts.map((value) => ({ value, label: cohortName(value) })),
          ])}
          {selectFilter("status", "Application status", [
            { value: "ALL", label: "All statuses" },
            ...applicationStatuses,
          ])}
          {selectFilter("year", "Submission year", [
            { value: "ALL", label: "All years" },
            ...years.map((value) => ({ value, label: value })),
          ])}
          <div className={styles.filter}>
            <span>Applied from (Kigali)</span>
            <AdminDatePicker
              label="Applied from (Kigali)"
              value={filters.from}
              onChange={(value) => updateFilter("from", value)}
            />
          </div>
          <div className={styles.filter}>
            <span>Applied through (Kigali)</span>
            <AdminDatePicker
              label="Applied through (Kigali)"
              value={filters.to}
              onChange={(value) => updateFilter("to", value)}
            />
          </div>
          {selectFilter("sort", "Sort applications", [
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "name", label: "Applicant A–Z" },
            { value: "cohort", label: "Cohort number" },
            { value: "course", label: "Program A–Z" },
            { value: "status", label: "Status A–Z" },
          ])}
        </div>
        {filters.from && filters.to && filters.from > filters.to && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            The end date must be on or after the start date.
          </p>
        )}
        <div className={styles.filterFooter}>
          <span>
            Filters apply to analytics, the table, and exported results.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters(DEFAULT_ADMIN_FILTERS);
              setPage(1);
              setSelectedApplicationIds([]);
            }}
          >
            Reset filters
          </Button>
        </div>
      </section>
      <ApplicationAnalytics rows={filtered} total={applications.length} />
      <section
        className={styles.panel}
        aria-labelledby="applications-table-heading"
        aria-busy={loading}
      >
        <div className={styles.tableHeader}>
          <div>
            <h2 id="applications-table-heading">Applicant records</h2>
            <p className={styles.note} role="status">
              Showing {pagination.start}–{pagination.end} of{" "}
              {filtered.length.toLocaleString()} matching applications
            </p>
          </div>
          <Button
            variant="outline"
            disabled={!filtered.length}
            onClick={() => generateDownloadExcel(filtered, filters.status)}
          >
            <Download size={15} className="mr-2" />
            Export filtered results
          </Button>
        </div>
        {selectedApplicationIds.length > 0 && (
          <div className={styles.selection}>
            <strong>
              {selectedApplicationIds.length} selected across pages
            </strong>
            <AdminSelect
              label="Change selected status"
              value={bulkStatus}
              onChange={setBulkStatus}
              options={applicationStatuses}
              placeholder="Choose status"
            />
            <Button
              onClick={bulkUpdate}
              disabled={!bulkStatus || !selectedNeedingChange || isBulkUpdating}
            >
              {isBulkUpdating ? (
                <Loader2 className="mr-2 animate-spin" size={15} />
              ) : null}
              Update selected
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedApplicationIds([])}
              disabled={isBulkUpdating}
            >
              Clear selection
            </Button>
          </div>
        )}
        {!filtered.length ? (
          <p className={styles.empty}>No applications match these filters.</p>
        ) : (
          <div className={styles.tableScroll}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      checked={
                        allSelected
                          ? true
                          : selectedVisible
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) =>
                        togglePage(checked === true)
                      }
                      aria-label="Select all applications on this page"
                      disabled={isBulkUpdating}
                    />
                  </TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied · Kigali</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={
                      selectedApplicationIds.includes(row.id)
                        ? "selected"
                        : undefined
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedApplicationIds.includes(row.id)}
                        onCheckedChange={(checked) =>
                          toggle(row.id, checked === true)
                        }
                        disabled={isBulkUpdating}
                        aria-label={`Select ${row.fullName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-slate-800">
                        {row.fullName}
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">
                        {row.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.course?.name || "Data not available"}
                    </TableCell>
                    <TableCell>{cohortName(cohortOf(row))}</TableCell>
                    <TableCell>
                      <span
                        className={`${styles.status} ${(
                          statusColors[row.status] ||
                          "bg-slate-100 text-slate-700"
                        )
                          .split(" ")
                          .filter(
                            (value) =>
                              !value.startsWith("shadow") &&
                              !value.startsWith("py-"),
                          )
                          .join(" ")}`}
                      >
                        {applicationStatuses.find(
                          (status) => status.value === row.status,
                        )?.label || row.status.replaceAll("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {kigaliDay(row.createdAt)}
                      <span className="mt-1 block text-sm text-slate-500">
                        {kigaliDateTimeInput(row.createdAt).slice(11)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/applications/${row.id}?from=${encodeURIComponent(listHref)}`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`View application for ${row.fullName}`}
                        >
                          View
                          <ArrowUpRight size={14} className="ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <nav className={styles.pagination} aria-label="Applications pagination">
          <div className="w-40">
            <AdminSelect
              label="Rows per page"
              value={String(pagination.size)}
              onChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
              options={[10, 25, 50, 100].map((size) => ({
                value: String(size),
                label: String(size),
              }))}
            />
          </div>
          <div>
            <span aria-live="polite">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-label="Previous page"
              disabled={pagination.page === 1}
              onClick={() => setPage(pagination.page - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Next page"
              disabled={pagination.page === pagination.pages}
              onClick={() => setPage(pagination.page + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </nav>
      </section>
    </div>
  );
}
