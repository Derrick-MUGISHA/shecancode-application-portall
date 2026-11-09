"use client";

// @refresh reset
// Remount after development edits; data and view state live in the shared query cache.

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { Arrow as PopoverArrow } from "@radix-ui/react-popover";
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
import { AdminPageContentSkeleton } from "./admin-skeletons";
import ProfileAvatar from "./profile-avatar";
import TablePagination from "./table-pagination";
import ContactLink from "../contact-link";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Eye,
  EyeOff,
  Download,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  Inbox,
  RotateCcw,
  X,
  UsersRound,
} from "lucide-react";
import { updateApplicationStatuses } from "@/lib/actions";
import { generateDownloadExcel } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import type {
  Application,
  ApplicationsResult,
} from "@/lib/admin-application-list-types";
import {
  useAdminApplications,
  ADMIN_APPLICATIONS_VIEW_KEY,
} from "@/hooks/use-admin-applications";
import { useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

const EMPTY_APPLICATIONS: Application[] = [];

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
  restoreView = false,
}: {
  initialData?: ApplicationsResult;
  restoreView?: boolean;
  initialFilters: Partial<AdminFilters> & { page?: number; pageSize?: number };
}) {
  const queryClient = useQueryClient();
  const applicationQuery = useAdminApplications(initialData);
  const applications =
    applicationQuery.data?.applications ?? EMPTY_APPLICATIONS;
  const viewKey = useMemo(
    () => [...ADMIN_APPLICATIONS_VIEW_KEY, auth.currentUser?.uid ?? "session"],
    [auth.currentUser?.uid],
  );
  const cachedView = queryClient.getQueryData<{
    filters: AdminFilters;
    page: number;
    pageSize: number;
    hideDetails: boolean;
  }>(viewKey);
  const savedView = restoreView ? cachedView : undefined;
  const [filters, setFilters] = useState<AdminFilters>(
    () => savedView?.filters ?? { ...DEFAULT_ADMIN_FILTERS, ...initialFilters },
  );
  const [page, setPage] = useState(savedView?.page ?? initialFilters.page ?? 1);
  const [pageSize, setPageSize] = useState(
    savedView?.pageSize ?? initialFilters.pageSize ?? 25,
  );
  const [hideDetails, setHideDetails] = useState(
    cachedView?.hideDetails ?? false,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterPanelRef = useRef<HTMLElement>(null);
  const [filterPanelWidth, setFilterPanelWidth] = useState(0);
  useEffect(() => {
    const panel = filterPanelRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(() =>
      setFilterPanelWidth(panel.clientWidth),
    );
    observer.observe(panel);
    setFilterPanelWidth(panel.clientWidth);
    return () => observer.disconnect();
  }, [applicationQuery.isPending]);
  const [refreshing, setLoading] = useState(false);
  const loading = refreshing || applicationQuery.isPending;
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [refreshError, setError] = useState<string | null>(null);
  const error = refreshError ?? (applicationQuery.error?.message || null);
  useEffect(() => {
    queryClient.setQueryData(viewKey, { filters, page, pageSize, hideDetails });
  }, [queryClient, viewKey, filters, page, pageSize, hideDetails]);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<
    string[]
  >([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const { toast } = useToast();
  const filtered = useMemo(
    () => filterAdminApplications(applications, filters),
    [applications, filters],
  );
  const activeFilterCount = (
    Object.keys(DEFAULT_ADMIN_FILTERS) as (keyof AdminFilters)[]
  ).filter(
    (key) => key !== "search" && filters[key] !== DEFAULT_ADMIN_FILTERS[key],
  ).length;
  const additionalFilterCount = (
    ["year", "from", "to", "sort"] as const
  ).filter((key) => filters[key] !== DEFAULT_ADMIN_FILTERS[key]).length;
  const hasActiveFilters = activeFilterCount > 0 || Boolean(filters.search);
  const resetFilters = () => {
    setFilters({ ...DEFAULT_ADMIN_FILTERS });
    setPage(1);
    setSelectedApplicationIds([]);
    setBulkStatus("");
  };
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
        params.set(key, filters[key] || "ALL");
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
  const lastRefresh = useRef(applicationQuery.dataUpdatedAt);
  const refreshActive = useRef(false);
  const refresh = async (background = false) => {
    if (refreshActive.current) return;
    refreshActive.current = true;
    if (!background) setLoading(true);
    try {
      const result = await applicationQuery.refetch({ cancelRefetch: false });
      if (result.error) throw result.error;
      setError(null);
    } catch {
      setError("Unable to refresh applications. Please try again.");
    } finally {
      lastRefresh.current = Date.now();
      refreshActive.current = false;
      setLoading(false);
    }
  };
  useEffect(() => {
    const refreshInBackground = () => {
      if (
        document.visibilityState === "visible" &&
        applicationQuery.data &&
        !applicationQuery.isFetching &&
        !isBulkUpdating &&
        !bulkDialogOpen &&
        Date.now() -
          Math.max(lastRefresh.current, applicationQuery.dataUpdatedAt) >=
          60000
      )
        void refresh(true);
    };
    // Refresh on return to a stale tab, rather than fetching every five seconds.
    window.addEventListener("focus", refreshInBackground);
    document.addEventListener("visibilitychange", refreshInBackground);
    // Cached results stay visible while a stale return checks only their version.
    refreshInBackground();
    return () => {
      window.removeEventListener("focus", refreshInBackground);
      document.removeEventListener("visibilitychange", refreshInBackground);
    };
  }, [
    isBulkUpdating,
    bulkDialogOpen,
    applicationQuery.dataUpdatedAt,
    applicationQuery.isFetching,
  ]);
  const openSelectionOptions = () => {
    setBulkStatus("");
    setBulkError("");
    setBulkDialogOpen(true);
  };
  const toggle = (id: string, checked: boolean) => {
    setSelectedApplicationIds((current) =>
      checked
        ? Array.from(new Set([...current, id]))
        : current.filter((value) => value !== id),
    );
    if (checked) openSelectionOptions();
  };
  const togglePage = (checked: boolean) => {
    setSelectedApplicationIds((current) =>
      checked
        ? Array.from(new Set([...current, ...visibleIds]))
        : current.filter((id) => !visibleIds.includes(id)),
    );
    if (checked && visibleIds.length) openSelectionOptions();
  };
  const bulkUpdate = async () => {
    if (
      !selectedApplicationIds.length ||
      !bulkStatus ||
      !selectedNeedingChange ||
      isBulkUpdating
    )
      return;
    setBulkError("");
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
      if (!result.success) setBulkError(result.message);
      if (result.success) {
        setBulkDialogOpen(false);
        setSelectedApplicationIds([]);
        setBulkStatus("");
        await refresh();
      }
    } catch {
      setBulkError("Unable to update applications. Please try again.");
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
      value={filters[key] || "ALL"}
      onChange={(value) => updateFilter(key, value)}
      options={options}
    />
  );
  const activeFilters: { key: keyof AdminFilters; label: string }[] = [
    {
      key: "search",
      label: hideDetails ? "Search active" : `Search: ${filters.search}`,
    },
    {
      key: "course",
      label: `Program: ${courses.find((course) => course.id === filters.course)?.name || "Data not available"}`,
    },
    { key: "cohort", label: `Cohort: ${cohortName(filters.cohort)}` },
    {
      key: "status",
      label: `Status: ${applicationStatuses.find((status) => status.value === filters.status)?.label || filters.status}`,
    },
    { key: "year", label: `Year: ${filters.year}` },
    { key: "from", label: `From: ${filters.from}` },
    { key: "to", label: `Through: ${filters.to}` },
    {
      key: "sort",
      label: `Sort: ${({ oldest: "Oldest first", name: "Applicant A–Z", cohort: "Cohort number", course: "Program A–Z", status: "Status A–Z" } as Record<string, string>)[filters.sort] || "Newest first"}`,
    },
    { key: "focus", label: "Open cohorts only" },
  ];
  if (applicationQuery.isPending) return <AdminPageContentSkeleton kind="applications" />;
  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Admissions workspace</span>
          <h1>Applications</h1>
          <p>
            A clear view of every applicant. Move the next opportunity forward.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={filters.focus === "OPEN" ? "default" : "outline"}
            aria-pressed={filters.focus === "OPEN"}
            onClick={() =>
              updateFilter("focus", filters.focus === "OPEN" ? "ALL" : "OPEN")
            }
            title="Show applicants in open cohorts with spaces available"
          >
            <UsersRound className="h-4 w-4" />
            Focus: open cohorts
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-pressed={hideDetails}
            onClick={() => setHideDetails((value) => !value)}
          >
            {hideDetails ? (
              <Eye size={16} className="mr-2" />
            ) : (
              <EyeOff size={16} className="mr-2" />
            )}
            {hideDetails ? "Show details" : "Hide details"}
          </Button>
          <Button
            variant="outline"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? "mr-2 animate-spin" : "mr-2"}
            />
            Refresh
          </Button>
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}{" "}
          <Button variant="outline" onClick={() => void refresh()}>
            Try again
          </Button>
        </div>
      )}
      <ApplicationAnalytics rows={filtered} total={applications.length} />
      <section
        ref={filterPanelRef}
        className={styles.compactFilterBar}
        aria-label="Application filters"
      >
        <div className={styles.primaryFilters}>
          <div className={`${styles.filter} ${styles.compactSearch}`}>
            <label htmlFor="admin-applicant-search">Search applicants</label>
            <span className={styles.searchField}>
              <Search size={16} aria-hidden="true" />
              <Input
                id="admin-applicant-search"
                type={hideDetails ? "password" : "search"}
                placeholder="Search by name or email…"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
              />
              {filters.search && (
                <button
                  type="button"
                  className={styles.clearSearch}
                  aria-label="Clear applicant search"
                  onClick={() => updateFilter("search", "")}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </span>
          </div>
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
          <div className={styles.filterActions}>
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={styles.filterTrigger}
                >
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  More filters
                  {additionalFilterCount > 0 && (
                    <span
                      className={styles.filterCount}
                      aria-label={`${additionalFilterCount} additional active filters`}
                    >
                      {additionalFilterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={14}
                collisionBoundary={
                  filterPanelRef.current?.closest("main") ?? undefined
                }
                collisionPadding={16}
                style={{
                  maxWidth: filterPanelWidth
                    ? Math.min(480, Math.max(0, filterPanelWidth - 32))
                    : undefined,
                }}
                aria-labelledby="application-filters-title"
                aria-describedby="application-filters-description"
                className={`${styles.filterPopover} w-[480px] max-w-[calc(100vw-32px)] rounded-2xl p-0`}
              >
                <div className={styles.popoverHeader}>
                  <div>
                    <h2 id="application-filters-title">
                      More filters & sorting
                    </h2>
                    <p id="application-filters-description">
                      Results update as you choose your filters.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Close filters"
                    onClick={() => setFiltersOpen(false)}
                  >
                    <X size={18} aria-hidden="true" />
                  </Button>
                </div>
                <div className={styles.popoverBody}>
                  <div className={styles.popoverGrid}>
                    {selectFilter("year", "Submission year", [
                      { value: "ALL", label: "All years" },
                      ...years.map((value) => ({ value, label: value })),
                    ])}
                    {selectFilter("sort", "Sort applications", [
                      { value: "newest", label: "Newest first" },
                      { value: "oldest", label: "Oldest first" },
                      { value: "name", label: "Applicant A–Z" },
                      { value: "cohort", label: "Cohort number" },
                      { value: "course", label: "Program A–Z" },
                      { value: "status", label: "Status A–Z" },
                    ])}
                  </div>
                  <div className={styles.popoverSection}>
                    <h3>Submission dates · Kigali</h3>
                    <div className={styles.popoverGrid}>
                      <div className={styles.filter}>
                        <span>From</span>
                        <AdminDatePicker
                          label="Applied from (Kigali)"
                          value={filters.from}
                          onChange={(value) => updateFilter("from", value)}
                        />
                      </div>
                      <div className={styles.filter}>
                        <span>Through</span>
                        <AdminDatePicker
                          label="Applied through (Kigali)"
                          value={filters.to}
                          onChange={(value) => updateFilter("to", value)}
                        />
                      </div>
                    </div>
                    {filters.from &&
                      filters.to &&
                      filters.from > filters.to && (
                        <p role="alert" className="mt-3 text-sm text-red-700">
                          The end date must be on or after the start date.
                        </p>
                      )}
                  </div>

                </div>
                <div className={styles.popoverFooter}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!hasActiveFilters}
                    onClick={resetFilters}
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                    Reset filters
                  </Button>
                  <Button type="button" onClick={() => setFiltersOpen(false)}>
                    Show {filtered.length.toLocaleString()} result
                    {filtered.length === 1 ? "" : "s"}
                  </Button>
                </div>
                <PopoverArrow className={styles.filterPopoverArrow} width={18} height={9} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className={styles.activeFilterRow}>
          <span className={styles.filterResults} role="status">
            {filtered.length.toLocaleString()} result
            {filtered.length === 1 ? "" : "s"}
            {hasActiveFilters ? " · filtered" : ""}
          </span>
          {hasActiveFilters && (
            <div className={styles.filterChips} aria-label="Active filters">
              {activeFilters
                .filter(
                  ({ key }) => filters[key] !== DEFAULT_ADMIN_FILTERS[key],
                )
                .map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={styles.filterChip}
                    aria-label={`Remove ${label}`}
                    title={label}
                    onClick={() =>
                      updateFilter(key, DEFAULT_ADMIN_FILTERS[key] ?? "")
                    }
                  >
                    <span>{label}</span>
                    <X size={12} aria-hidden="true" />
                  </button>
                ))}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!hasActiveFilters}
            onClick={resetFilters}
            className={styles.resetFilters}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Reset all
          </Button>
        </div>
      </section>
      {filters.focus === "OPEN" && (
        <p role="status" className="text-sm text-slate-600">
          Focus mode shows applications in open cohorts with available spaces.
          Turn it off to see all records.
        </p>
      )}
      <section
        className={styles.recordsSection}
        aria-labelledby="applications-table-heading"
        aria-busy={loading}
      >
        <div className={styles.tableHeader}>
          <div>
            <h2
              id="applications-table-heading"
              className="flex items-center gap-2"
            >
              Applicant records
              <span className={styles.recordCount}>
                {filtered.length.toLocaleString()}
              </span>
            </h2>
            <p className={styles.note} role="status">
              Showing {pagination.start}–{pagination.end} of{" "}
              {filtered.length.toLocaleString()} matching applications
              {selectedApplicationIds.length > 0 && (
                <span className="font-medium text-slate-700">
                  {" "}
                  · {selectedApplicationIds.length.toLocaleString()} selected
                </span>
              )}
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
          <div
            className={styles.selectionBar}
            aria-label="Selected applications"
          >
            <strong>
              {selectedApplicationIds.length.toLocaleString()} selected
            </strong>
            <Dialog
              open={bulkDialogOpen}
              onOpenChange={(open) => {
                if (isBulkUpdating) return;
                setBulkDialogOpen(open);
                if (open) {
                  setBulkStatus("");
                  setBulkError("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" size="sm" disabled={isBulkUpdating}>
                  Update status
                </Button>
              </DialogTrigger>
              <DialogContent
                className={`${styles.bulkDialog} w-[calc(100vw-32px)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-white p-6`}
              >
                <DialogHeader className="pr-6">
                  <DialogTitle>Update application status</DialogTitle>
                  <DialogDescription>
                    Choose a status for{" "}
                    {selectedApplicationIds.length.toLocaleString()} selected
                    application{selectedApplicationIds.length === 1 ? "" : "s"}.
                  </DialogDescription>
                </DialogHeader>
                <AdminSelect
                  label="New status"
                  disabled={isBulkUpdating}
                  value={bulkStatus}
                  onChange={(value) => {
                    setBulkStatus(value);
                    setBulkError("");
                  }}
                  options={applicationStatuses}
                  placeholder="Choose a status"
                />
                <p
                  id="bulk-status-help"
                  role="status"
                  className={styles.bulkHelp}
                >
                  {!bulkStatus
                    ? "Applications keep their current status until you save."
                    : !selectedNeedingChange
                      ? "All selected applications already have this status. Choose a different status to update them."
                      : `${selectedNeedingChange} of ${selectedApplicationIds.length} selected applications will change. Applications already at this status will stay as they are.`}
                </p>
                {bulkError && (
                  <p
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {bulkError}
                  </p>
                )}
                <DialogFooter className="gap-2 border-t border-slate-100 pt-4 sm:space-x-0">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBulkUpdating}
                    onClick={() => setBulkDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={bulkUpdate}
                    aria-describedby="bulk-status-help"
                    disabled={
                      !bulkStatus || !selectedNeedingChange || isBulkUpdating
                    }
                  >
                    {isBulkUpdating && (
                      <Loader2
                        className="animate-spin"
                        size={15}
                        aria-hidden="true"
                      />
                    )}
                    {isBulkUpdating
                      ? "Updating…"
                      : selectedNeedingChange && bulkStatus
                        ? `Update ${selectedNeedingChange} application${selectedNeedingChange === 1 ? "" : "s"}`
                        : "Update status"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedApplicationIds([]);
                setBulkStatus("");
              }}
              disabled={isBulkUpdating}
            >
              Clear selection
            </Button>
          </div>
        )}
        {!filtered.length ? (
          <div className={styles.empty}>
            <Inbox size={24} aria-hidden="true" />
            <strong>
              {applications.length
                ? "No matching applications"
                : "Your next cohort starts here"}
            </strong>
            <p>
              {applications.length
                ? "Try a different name, program, or status to find an applicant."
                : "New applications will appear here when applicants submit their forms."}
            </p>
            {applications.length > 0 && (
              <Button variant="outline" onClick={resetFilters}>
                Clear filters
              </Button>
            )}
          </div>
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
                  <TableHead aria-label="Row number">#</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.rows.map((row, index) => (
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
                        aria-label={
                          hideDetails
                            ? "Select hidden applicant"
                            : `Select ${hideDetails ? "Applicant hidden" : row.fullName}`
                        }
                      />
                    </TableCell>
                    <TableCell className={styles.rowNumber}>
                      {pagination.start + index}
                    </TableCell>
                    <TableCell>
                      <div className={styles.applicant}>
                        <ProfileAvatar id={row.id} hidden={hideDetails} />
                        <div>
                          <span className="font-semibold text-slate-800">
                            {hideDetails ? "Applicant hidden" : row.fullName}
                          </span>
                          <span className="mt-1 block text-sm text-slate-500">
                            {hideDetails ? (
                              "Email hidden"
                            ) : (
                              <ContactLink value={row.email} kind="email" />
                            )}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.course?.name || "Data not available"}
                      <span className="mt-1 block text-sm text-slate-500">
                        From: {row.entrySourceDomain || "Data not available"}
                      </span>
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
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        aria-label={`View application for ${hideDetails ? "Applicant hidden" : row.fullName}`}
                      >
                        <Link
                          href={`/admin/applications/${row.id}?from=${encodeURIComponent(listHref)}`}
                        >
                          View
                          <ArrowUpRight size={14} className="ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <TablePagination page={pagination.page} pageSize={pagination.size} total={filtered.length} noun="applications"
          ariaLabel="Applications pagination" filtered={hasActiveFilters} selected={selectedApplicationIds.length}
          onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1) }} />
      </section>
    </div>
  );
}
