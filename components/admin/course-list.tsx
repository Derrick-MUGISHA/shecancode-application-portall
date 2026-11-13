"use client";

import { useQueryClient } from "@tanstack/react-query";
import { adminProgramsOptions } from "@/hooks/use-admin-programs";
import { ADMIN_APPLICATIONS_KEY } from "@/hooks/use-admin-applications";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  Loader2,
  Layers3,
  RefreshCw,
  Search,
  BookOpen,
  DoorOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  acceptingApplications,
  kigaliDateTimeInput,
} from "@/lib/program-availability";
import {
  availableProgram,
  visibleAdminCohorts,
  cohortSettingsFor,
  courseDetailsSchema,
} from "@/lib/cohorts";
import { auth } from "@/lib/firebase";
import { compareProgramOrder, moveProgram } from "@/lib/program-order";
import type { Program, CohortOption } from "@/lib/program-types";
import { paginateAdminRows, kigaliDay } from "@/lib/admin-applications";
import { toast } from "@/components/ui/use-toast";
import CohortNumberInput from "./cohort-number-input";
import AdminSelect from "./admin-select";
import AdminDatePicker from "./admin-date-picker";
import styles from "./admin.module.css";
import MetricTrend from "./metric-trend";
import TablePagination from "./table-pagination";
import { AdminPageContentSkeleton, ProgramListSkeleton } from "./admin-skeletons";

export type AdminProgram = Program & { createdAt?: string };
type Errors = Record<string, string>;
const fieldErrors = (issues: { path: PropertyKey[]; message: string }[]) =>
  Object.fromEntries(
    issues.map((issue) => [String(issue.path[0]), issue.message]),
  );

export default function CourseList({
  initialPrograms,
}: { initialPrograms?: AdminProgram[] } = {}) {
  const queryClient = useQueryClient();
  const prefetchedPrograms = queryClient.getQueryData<AdminProgram[]>(adminProgramsOptions().queryKey);
  const [programs, setProgramState] = useState<AdminProgram[]>(prefetchedPrograms || initialPrograms || []);
  const setPrograms = (data: AdminProgram[]) => {
    setProgramState(data);
    queryClient.setQueryData(adminProgramsOptions().queryKey, data);
  };
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialPrograms && !prefetchedPrograms);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [focusOpen, setFocusOpen] = useState(false);
  const [availability, setAvailability] = useState("ALL");
  const [sort, setSort] = useState("display");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [cohortPages, setCohortPages] = useState<Record<string, { page: number; size: number }>>({});
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(initialPrograms?.[0] ? [initialPrograms[0].id] : []),
  );
  const [programDialog, setProgramDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<AdminProgram | null>(
    null,
  );
  const [programForm, setProgramForm] = useState({
    name: "",
    description: "",
    isOpen: true,
  });
  const [cohortProgram, setCohortProgram] = useState<AdminProgram | null>(null);
  const [editingCohort, setEditingCohort] = useState<CohortOption | null>(null);
  const [cohortForm, setCohortForm] = useState({
    number: "1",
    capacity: "",
    closesAt: "",
    isOpen: true,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<{
    program: AdminProgram;
    cohort?: CohortOption;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const orderElements = useRef(new Map<string, HTMLElement>());
  const previousPositions = useRef(new Map<string, { top: number; left: number }>());
  useLayoutEffect(() => {
    const positions = new Map<string, { top: number; left: number }>();
    for (const [id, element] of orderElements.current) {
      const rect = element.getBoundingClientRect();
      positions.set(id, { top: rect.top + window.scrollY, left: rect.left + window.scrollX });
      const previous = previousPositions.current.get(id);
      if (!previous || window.matchMedia("(prefers-reduced-motion: reduce)").matches) continue;
      const x = previous.left - (rect.left + window.scrollX), y = previous.top - (rect.top + window.scrollY);
      if (Math.abs(x) < 1 && Math.abs(y) < 1) continue;
      element.getAnimations().forEach(animation => animation.cancel());
      element.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: "translate(0, 0)" }], {
        duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }
    previousPositions.current = positions;
  }, [programs, sort, page, pageSize, expanded, cohortPages]);
  const registerOrderElement = (id: string, element: HTMLElement | null) => {
    if (element) orderElements.current.set(id, element); else orderElements.current.delete(id);
  };
  const [dragged, setDragged] = useState<string | null>(null);
  const dragOrigin = useRef<EventTarget | null>(null);
  const dragPreview = useRef<HTMLDivElement | null>(null);
  const finishDrag = () => {
    dragPreview.current?.remove();
    dragPreview.current = null;
    dragOrigin.current = null;
    setDragged(null);
    setDropTarget(null);
  };
  useEffect(() => () => { dragPreview.current?.remove() }, []);
  const [orderMessage, setOrderMessage] = useState("");
  const lastLoad = useRef(Date.now());
  const inFlight = useRef(false);
  const load = useCallback(async (quiet = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    if (!quiet) setLoading(true);
    try {
      const data = await queryClient.fetchQuery({ ...adminProgramsOptions(), staleTime: 0 });
      setProgramState(data);

      setLoadError("");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load programs.",
      );
    } finally {
      lastLoad.current = Date.now();
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [queryClient]);
  useEffect(() => {
    const cached = queryClient.getQueryData<AdminProgram[]>(adminProgramsOptions().queryKey);
    if (cached || initialPrograms) {
      setProgramState(cached || initialPrograms || []);
      if (!cached && initialPrograms) queryClient.setQueryData(adminProgramsOptions().queryKey, initialPrograms);
      setLoading(false);
      setLoadError("");
      lastLoad.current = Date.now();
    } else void load();
  }, [initialPrograms, load, queryClient]);
  useEffect(() => {
    // Keep visible lists current; leave active edits and drag operations undisturbed.
    const refresh = () => {
      if (
        document.visibilityState === "visible" &&
        !saving &&
        !dragged &&
        !programDialog &&
        !cohortProgram &&
        !deleting &&
        Date.now() - lastLoad.current >= 2000
      )
        void load(true);
    };
    const interval = setInterval(refresh, 2000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [saving, dragged, programDialog, cohortProgram, deleting, load]);
  const filtered = useMemo(
    () =>
      programs
        .filter(
          (program) =>
            `${program.name} ${(program.cohorts || []).map((cohort) => cohort.cohortLabel).join(" ")}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()) &&
            (!focusOpen || visibleAdminCohorts(program, true).length > 0) &&
            (availability === "ALL" ||
              (availability === "OPEN"
                ? availableProgram(program)
                : !availableProgram(program))),
        )
        .sort((a, b) =>
          sort === "display" ? compareProgramOrder(a, b) : sort === "newest"
            ? new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime()
            : sort === "cohorts"
              ? (b.cohorts?.length || 0) - (a.cohorts?.length || 0)
              : a.name.localeCompare(b.name),
        ),
    [programs, query, availability, sort, focusOpen],
  );
  const pagination = paginateAdminRows(filtered, page, pageSize);
  const openProgram = (program?: AdminProgram) => {
    setEditingProgram(program || null);
    setProgramForm({
      name: program?.name || "",
      description: program?.description || "",
      isOpen: program?.isOpen !== false,
    });
    setErrors({});
    setSaveError("");
    setProgramDialog(true);
  };
  const openCohort = (program: AdminProgram, cohort?: CohortOption) => {
    setCohortProgram(program);
    setEditingCohort(cohort || null);
    setCohortForm({
      number: String(
        cohort?.number ||
          Math.max(0, ...(program.cohorts || []).map((item) => item.number)) +
            1,
      ),
      capacity: cohort?.capacity == null ? "" : String(cohort.capacity),
      closesAt: kigaliDateTimeInput(cohort?.closesAt),
      isOpen: cohort ? cohort.isOpen : true,
    });
    setErrors({});
    setSaveError("");
  };
  const fail = (map: Errors) => {
    setErrors(map);
    const first = Object.keys(map)[0];
    requestAnimationFrame(() =>
      document.getElementById(`admin-${first}`)?.focus(),
    );
  };
  const save = async (event: React.FormEvent, kind: "program" | "cohort") => {
    event.preventDefault();
    setSaveError("");
    setErrors({});
    let payload: unknown;
    if (kind === "program") {
      const result = courseDetailsSchema.safeParse(programForm);
      if (!result.success) {
        fail(fieldErrors(result.error.issues));
        return;
      }
      payload = result.data;
    } else {
      const date = cohortForm.closesAt
        ? new Date(cohortForm.closesAt + "+02:00")
        : null;
      if (date && Number.isNaN(date.getTime())) {
        fail({ closesAt: "Choose a valid closing date and time." });
        return;
      }
      const result = cohortSettingsFor(editingCohort || undefined).safeParse({
        number: Number(cohortForm.number),
        capacity: cohortForm.capacity ? Number(cohortForm.capacity) : null,
        closesAt: date?.toISOString() ?? null,
        isOpen: cohortForm.isOpen,
      });
      if (!result.success) {
        fail(fieldErrors(result.error.issues));
        return;
      }
      if (
        result.data.capacity != null &&
        result.data.capacity < (editingCohort?.applicationCount || 0)
      ) {
        fail({
          capacity:
            "Spaces cannot be fewer than applications already received by this cohort.",
        });
        return;
      }
      payload = result.data;
    }
    setSaving(true);
    try {
      const url =
        kind === "program"
          ? `/api/courses${editingProgram ? `/${editingProgram.id}` : ""}`
          : `/api/courses/${cohortProgram!.id}/cohorts${editingCohort ? `/${editingCohort.id}` : ""}`;
      const response = await fetch(url, {
        method: (kind === "program" ? editingProgram : editingCohort)
          ? "PATCH"
          : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        if (data.errors)
          fail(
            Object.fromEntries(
              Object.entries(data.errors).map(([key, value]) => [
                key,
                (value as string[])[0],
              ]),
            ),
          );
        setSaveError(data.message || "Unable to save. Please try again.");
        return;
      }
      toast({
        title: kind === "program" ? "Program saved" : "Cohort saved",
        description:
          kind === "cohort"
            ? "This cohort belongs to its program and has its own capacity and deadline."
            : "Program details updated.",
      });
      setProgramDialog(false);
      if (cohortProgram) setExpanded((current) => new Set(current).add(cohortProgram.id));
      setCohortProgram(null);
      void queryClient.invalidateQueries({ queryKey: ADMIN_APPLICATIONS_KEY });
      setPage(1);
      await load(true);
    } catch {
      setSaveError("Unable to save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch(
        `/api/courses/${deleting.program.id}${deleting.cohort ? `/cohorts/${deleting.cohort.id}` : ""}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setSaveError((await response.json()).message || "Unable to delete.");
        return;
      }
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ADMIN_APPLICATIONS_KEY });
      setPage(1);
      await load(true);
    } catch {
      setSaveError("Unable to delete. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const reorder = async (source: string, target: string) => {
    if (saving || refreshing || source === target) return;
    const previous = programs;
    const items = [...programs].sort(compareProgramOrder);
    const moved = moveProgram(items, source, target);
    if (moved === items) return;
    const base = -Date.now();
    const ordered = moved.map((item, index) => ({ ...item, displayOrder: base + index / moved.length }));
    setSaving(true);
    setOrderMessage("Saving display order…");
    setProgramState(ordered);
    finishDrag();
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/courses/order", {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify({ ids: ordered.map(item => item.id) }),
      });
      if (!response.ok) throw Error((await response.json()).message || "Unable to save display order.");
      setPrograms(ordered);
      setOrderMessage("Display order saved. Applicants will see this order too.");
    } catch (error) {
      setPrograms(previous);
      setOrderMessage(error instanceof Error ? error.message : "Unable to save display order.");
      toast({ title: "Order was not saved", description: "The previous order has been restored. Refresh and try again.", variant: "destructive" });
    } finally { setSaving(false); }
  };
  const startProgramDrag = (event: React.DragEvent<HTMLElement>, program: AdminProgram) => {
    const origin = dragOrigin.current;
    if (saving || refreshing || sort !== "display" ||
      (origin instanceof Element && origin.closest('button, a, input, select, textarea, [role="button"], [contenteditable="true"]'))) {
      event.preventDefault();
      return;
    }
    dragPreview.current?.remove();
    // Keep the browser's drag image compact even when the program has a large
    // expanded cohort table. Never clone the whole card into the drag image.
    const preview = document.createElement("div");
    preview.className = styles.programDragPreview;
    preview.textContent = program.name;
    preview.setAttribute("aria-hidden", "true");
    document.body.appendChild(preview);
    dragPreview.current = preview;
    event.dataTransfer.setData("text/plain", program.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setDragImage(preview, 24, 24);
    setDragged(program.id);
  };
  const totalCohorts = programs.reduce(
    (sum, program) => sum + (program.cohorts?.length || 0),
    0,
  );
  const openCohorts = programs.reduce(
    (sum, program) =>
      sum +
      (program.isOpen === false
        ? 0
        : (program.cohorts || []).filter((cohort) =>
            acceptingApplications(cohort),
          ).length),
    0,
  );
  const metricTrends = useMemo(() => {
    const cohortRows = programs.flatMap((program) =>
      (program.cohorts || []).map((cohort) => ({
        ...cohort,
        programOpen: program.isOpen !== false,
      })),
    );
    const monthOf = (value?: string) =>
      value ? kigaliDay(value).slice(0, 7) : "";
    const latest = [
      ...programs.map((program) => monthOf(program.createdAt)),
      ...cohortRows.map((cohort) => monthOf(cohort.createdAt)),
    ]
      .filter(Boolean)
      .sort()
      .at(-1);
    const months = latest
      ? Array.from({ length: 12 }, (_, index) => {
          const date = new Date(`${latest}-01T00:00:00Z`);
          date.setUTCMonth(date.getUTCMonth() - 11 + index);
          return date.toISOString().slice(0, 7);
        })
      : [];
    return {
      months,
      programs: months.map(
        (month) =>
          programs.filter((program) => monthOf(program.createdAt) === month)
            .length,
      ),
      cohorts: months.map(
        (month) =>
          cohortRows.filter((cohort) => monthOf(cohort.createdAt) === month)
            .length,
      ),
      open: months.map(
        (month) =>
          cohortRows.filter(
            (cohort) =>
              cohort.programOpen &&
              acceptingApplications(cohort) &&
              monthOf(cohort.createdAt) === month,
          ).length,
      ),
    };
  }, [programs]);
  const message = (field: string) =>
    errors[field] ? (
      <p
        id={`admin-${field}-error`}
        role="alert"
        className="text-sm text-red-700"
      >
        {errors[field]}
      </p>
    ) : null;
  if (loading && programs.length === 0) return <AdminPageContentSkeleton kind="programs" />;
  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Program management</span>
          <h1>Programs & cohorts</h1>
          <p>
            Build the next cohort. Manage availability, spaces, and deadlines in
            one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading || refreshing || saving}
            onClick={() => void load(true)}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "mr-2 animate-spin" : "mr-2"}
            />
            Refresh
          </Button>
          <Button onClick={() => openProgram()}>
            <Plus size={16} className="mr-2" />
            Add program
          </Button>
        </div>
      </header>
      <section
        className={`${styles.metrics} ${styles.metricsThree}`}
        aria-label="Program overview"
      >
        {[
          {
            label: "Programs",
            value: programs.length,
            note: "Across your admissions workspace",
            icon: BookOpen,
            counts: metricTrends.programs,
            unit: "programs created",
            context: "Creation date · Kigali time",
          },
          {
            label: "Cohorts",
            value: totalCohorts,
            note: "Across all programs",
            icon: Layers3,
            counts: metricTrends.cohorts,
            unit: "cohorts created",
            context: "Creation date · Kigali time",
          },
          {
            label: "Open cohorts",
            value: openCohorts,
            note: "Currently accepting applications",
            icon: DoorOpen,
            counts: metricTrends.open,
            unit: "currently open cohorts",
            context:
              "Creation date · Kigali time · currently accepting applications; not historical availability",
          },
        ].map(({ label, value, note, icon: Icon, counts, unit, context }) => (
          <article
            key={label}
            className={`${styles.metric} ${styles.analyticsMetric}`}
            onMouseEnter={() => setHoveredMetric(label)}
            onMouseLeave={() => setHoveredMetric(null)}
          >
            <span>
              <Icon size={15} aria-hidden="true" />
              {label}
            </span>
            <div className={styles.metricBody}>
              <strong>{loading ? "—" : value.toLocaleString()}</strong>
              {!loading && (
                <MetricTrend
                  label={label}
                  counts={counts}
                  months={metricTrends.months}
                  active={hoveredMetric === label}
                  unit={unit}
                  context={context}
                />
              )}
            </div>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <section className={styles.programFilterBar} aria-label="Filter programs">
        <label className={styles.programSearch}>
          <span className="sr-only">Search programs or cohorts</span>
          <Search size={16} aria-hidden="true" />
          <Input
            type="search"
            value={query}
            placeholder="Search programs or cohorts…"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <AdminSelect
          label="Availability"
          value={availability}
          onChange={(value) => {
            setAvailability(value);
            setPage(1);
          }}
          options={[
            { value: "ALL", label: "All programs" },
            { value: "OPEN", label: "Accepting applications" },
            { value: "CLOSED", label: "Closed or full" },
          ]}
        />
        <AdminSelect
          label="Sort programs"
          value={sort}
          onChange={(value) => {
            setSort(value);
            setPage(1);
          }}
          options={[
            { value: "display", label: "Display order (drag to arrange)" },
            { value: "name", label: "Program A–Z" },
            { value: "newest", label: "Newest first" },
            { value: "cohorts", label: "Most cohorts" },
          ]}
        />
        {/* <label className={styles.programOpenFilter}>
          <Checkbox
            checked={focusOpen}
            onCheckedChange={(value) => {
              setFocusOpen(value === true);
              if (value === true) setExpanded((current) => new Set([...current, ...programs.filter((program) => visibleAdminCohorts(program, true).length > 0).map((program) => program.id)]));
              setPage(1);
            }}
          />
          <span>Open cohorts only</span>
        </label> */}
        <Button type="button" variant="default" size="sm" disabled={!filtered.length}
          onClick={() => setExpanded((current) => {
            const next = new Set(current);
            const collapse = filtered.every((program) => current.has(program.id));
            for (const program of filtered) {
              if (collapse) next.delete(program.id); else next.add(program.id);
            }
            return next;
          })}>
          {filtered.length > 0 && filtered.every((program) => expanded.has(program.id)) ? "Collapse all" : "Expand all"}
        </Button>
      </section>
      <p id="program-order-help" role="status" className="text-sm text-slate-600">{orderMessage || "New programs appear first. Drag a program card to save a different display order."}</p>
      {loadError && (
        <p role="alert">
          {loadError}{" "}
          <Button variant="outline" onClick={() => load()}>
            Retry
          </Button>
        </p>
      )}
      {loading ? (
        <ProgramListSkeleton />
      ) : !filtered.length ? (
        <div className={`${styles.panel} ${styles.empty}`}>
          <BookOpen size={24} aria-hidden="true" />
          <strong>
            {programs.length
              ? "No matching programs"
              : "Make room for the next cohort"}
          </strong>
          <p>
            {programs.length
              ? "Adjust your search or availability filters to see more programs."
              : "Add your first program, then create a cohort to start receiving applications."}
          </p>
          <Button
            variant={programs.length ? "outline" : "default"}
            onClick={() => {
              if (programs.length) {
                setQuery("");
                setAvailability("ALL");
                setFocusOpen(false);
                setPage(1);
              } else openProgram();
            }}
          >
            {programs.length ? "Clear filters" : "Add your first program"}
          </Button>
        </div>
      ) : (
        <div className={styles.programList}>
          {pagination.rows.map((program) => {
            const cohorts = visibleAdminCohorts(program, focusOpen);
            const settings = cohortPages[program.id] ?? { page: 1, size: 10 };
            const cohortPagination = paginateAdminRows(cohorts, settings.page, settings.size);
            return (
            <article key={program.id} ref={element => registerOrderElement(program.id, element)}
              draggable={!saving && !refreshing && sort === "display"}
              aria-label={program.name}
              aria-describedby="program-order-help"
              className={`${styles.program} ${sort === "display" && !saving ? styles.draggableProgram : ""} ${dragged === program.id ? styles.draggingRecord : ""} ${dropTarget === program.id ? styles.dropTarget : ""}`}
              onPointerDownCapture={event => { dragOrigin.current = event.target; }}
              onDragStart={event => startProgramDrag(event, program)}
              onDragEnd={finishDrag}
              onDragOver={event => {
                if (dragged && dragged !== program.id && sort === "display") {
                  event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget(program.id);
                }
              }}
              onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(current => current === program.id ? null : current); }}
              onDrop={event => {
                if (!dragged || sort !== "display") return;
                event.preventDefault();
                const source = dragged;
                finishDrag();
                void reorder(source, program.id);
              }}>
              <div className={styles.programTop}>
                <div>
                  <h2>{program.name}</h2>
                  {program.description && <p>{program.description}</p>}
                  <p>
                    {program.cohorts?.length || 0}{" "}
                    {(program.cohorts?.length || 0) === 1
                      ? "cohort"
                      : "cohorts"}{" "}
                    ·{" "}
                    {
                      (program.cohorts || []).filter((cohort) =>
                        acceptingApplications(cohort),
                      ).length
                    }{" "}
                    open · {program.applicationCount || 0} applications
                    {program.isOpen === false ? " · Program hidden" : ""}
                  </p>
                </div>
                <div className={styles.programActions}>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setExpanded((current) => {
                        const next = new Set(current);
                        if (next.has(program.id)) next.delete(program.id);
                        else next.add(program.id);
                        return next;
                      })
                    }
                    aria-expanded={expanded.has(program.id)}
                    aria-controls={`cohorts-${program.id}`}
                  >
                    <Layers3 size={16} className="mr-2" />
                    Cohorts
                    <ChevronDown size={15} className={expanded.has(program.id) ? "ml-2 rotate-180" : "ml-2"} />
                  </Button>
                  <Button
                    onClick={() => openCohort(program)}
                    aria-label={`Add cohort to ${program.name}`}
                  >
                    <Plus size={16} className="mr-2" />
                    Add cohort
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openProgram(program)}
                    aria-label={`Edit program ${program.name}`}
                  >
                    <Pencil size={16} className="mr-2" />
                    Edit program
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      !!program.applicationCount || !!program.cohorts?.length
                    }
                    title="Only programs without applications or cohorts can be deleted"
                    onClick={() => {
                      setDeleting({ program });
                      setSaveError("");
                    }}
                    aria-label={`Delete program ${program.name}`}
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete program
                  </Button>
                </div>
              </div>
              {expanded.has(program.id) && (
                <section
                  id={`cohorts-${program.id}`}
                  className={styles.cohortArea}
                  aria-labelledby={`cohorts-heading-${program.id}`}
                >
                  <div className={styles.cohortTableHeading}>
                    <div>
                      <h3 id={`cohorts-heading-${program.id}`}>Cohorts <span className={styles.recordCount}>{cohorts.length}</span></h3>
                      <p>{cohorts.reduce((sum, cohort) => sum + cohort.applicationCount, 0).toLocaleString()} applications across these cohorts</p>
                    </div>
                  </div>
                  {!program.cohorts?.length ? (
                    <p className="text-sm leading-7 text-slate-600">
                      No cohorts yet. Add the first cohort inside this program.
                      Existing applications stay with the program and show “Data
                      not available” for their cohort.
                    </p>
                  ) : (
                    <>
                    <div className={styles.tableScroll}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead aria-label="Row number">#</TableHead>
                            <TableHead>Cohort</TableHead>
                            <TableHead>Applications</TableHead>
                            <TableHead>Total spaces</TableHead>
                            <TableHead>Spaces left</TableHead>
                            <TableHead>Closes · Kigali</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cohortPagination.rows.map(
                            (cohort, index) => (
                              <TableRow key={cohort.id}>
                                <TableCell className={styles.rowNumber}>{cohortPagination.start + index}</TableCell>
                                <TableCell className="font-semibold">
                                  {cohort.cohortLabel}
                                </TableCell>
                                <TableCell>{cohort.applicationCount.toLocaleString()}</TableCell>
                                <TableCell>{cohort.capacity?.toLocaleString() ?? "Not set"}</TableCell>
                                <TableCell>{cohort.spacesLeft?.toLocaleString() ?? "Not set"}</TableCell>
                                <TableCell>
                                  {cohort.closesAt
                                    ? kigaliDateTimeInput(
                                        cohort.closesAt,
                                      ).replace("T", " · ")
                                    : "Data not available"}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`${styles.status} ${acceptingApplications(cohort) && program.isOpen !== false ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                                  >
                                    {acceptingApplications(cohort) &&
                                    program.isOpen !== false
                                      ? "Open"
                                      : cohort.spacesLeft === 0
                                        ? "Full"
                                        : "Closed"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm" asChild>
                                      <Link
                                        href={`/admin/applications?course=${program.id}&cohort=${cohort.cohortLabel}`}
                                      >
                                        Applications
                                      </Link>
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        openCohort(program, cohort)
                                      }
                                      aria-label={`Edit ${cohort.cohortLabel} in ${program.name}`}
                                    >
                                      <Pencil size={15} className="mr-2" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={cohort.applicationCount > 0}
                                      onClick={() => {
                                        setDeleting({ program, cohort });
                                        setSaveError("");
                                      }}
                                      aria-label={`Delete ${cohort.cohortLabel} in ${program.name}`}
                                    >
                                      <Trash2 size={15} className="mr-2" />
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ),
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <TablePagination page={cohortPagination.page} pageSize={cohortPagination.size} total={cohorts.length} noun="cohorts"
                      ariaLabel={`${program.name} cohorts pagination`} filtered={focusOpen}
                      onPageChange={page => setCohortPages(current => ({ ...current, [program.id]: { page, size: cohortPagination.size } }))}
                      onPageSizeChange={size => setCohortPages(current => ({ ...current, [program.id]: { page: 1, size } }))} />
                    </>
                  )}
                </section>
              )}
            </article>
            );
          })}
        </div>
      )}
      <TablePagination page={pagination.page} pageSize={pagination.size} total={filtered.length} noun="programs"
        ariaLabel="Programs pagination" filtered={!!query || availability !== "ALL" || focusOpen}
        onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1) }} />
      <Dialog
        open={programDialog}
        onOpenChange={(open) => {
          if (!saving) setProgramDialog(open);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto rounded-2xl bg-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingProgram ? "Edit program" : "Add program"}
            </DialogTitle>
            <DialogDescription>
              Program details are shared by all its cohorts. Add cohorts
              separately inside the program.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={(event) => save(event, "program")}
            className="space-y-5"
          >
            <div className="space-y-2">
              <label htmlFor="admin-name" className="text-sm font-medium">
                Program name
              </label>
              <Input
                id="admin-name"
                value={programForm.name}
                onChange={(event) =>
                  setProgramForm({ ...programForm, name: event.target.value })
                }
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "admin-name-error" : undefined}
                placeholder="e.g. Web Fundamentals"
                className="p-4"
              />
              {message("name")}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="admin-description"
                className="text-sm font-medium"
              >
                Description
              </label>
              <Textarea
                id="admin-description"
                value={programForm.description}
                onChange={(event) =>
                  setProgramForm({
                    ...programForm,
                    description: event.target.value,
                  })
                }
                className="min-h-28 text-sm"
              />
              {message("description")}
            </div>
            <label className="flex items-start gap-3 rounded-xl border p-4 text-sm">
              <Checkbox
                checked={programForm.isOpen}
                onCheckedChange={(value) =>
                  setProgramForm({ ...programForm, isOpen: value === true })
                }
              />
              <span>
                Show this program
                <p className="mt-1 text-sm text-slate-500">
                  Hide a program to pause applications across all its cohorts.
                </p>
              </span>
            </label>
            {saveError && (
              <p role="alert" className="text-sm text-red-700">
                {saveError}
              </p>
            )}
            <DialogFooter className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setProgramDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 animate-spin" size={16} />
                ) : null}
                Save program
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!cohortProgram}
        onOpenChange={(open) => {
          if (!open && !saving) setCohortProgram(null);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto rounded-2xl bg-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingCohort
                ? `Edit ${editingCohort.cohortLabel}`
                : "Add cohort"}
            </DialogTitle>
            <DialogDescription>
              {cohortProgram?.name} · Each cohort has its own application spaces
              and closing date.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={(event) => save(event, "cohort")}
            className="space-y-5"
          >
            <div className="space-y-2">
              <label htmlFor="admin-number" className="text-sm font-medium">
                Cohort number
              </label>
              <CohortNumberInput
                id="admin-number"
                disabled={!!editingCohort?.applicationCount}
                value={cohortForm.number}
                onValueChange={(number) =>
                  setCohortForm({ ...cohortForm, number })
                }
                aria-invalid={!!errors.number}
                aria-describedby={
                  errors.number ? "admin-number-error" : undefined
                }
              />
              <p className="text-sm text-slate-500">
                Numbered within this program: cohort-1, cohort-2, and so on.
              </p>
              {message("number")}
            </div>
            <div className="space-y-2">
              <label htmlFor="admin-capacity" className="text-sm font-medium">
                Total application spaces
              </label>
              <Input
                id="admin-capacity"
                type="number"
                min={Math.max(1, editingCohort?.applicationCount || 0)}
                max={100000}
                step={1}
                value={cohortForm.capacity}
                onChange={(event) =>
                  setCohortForm({ ...cohortForm, capacity: event.target.value })
                }
                aria-invalid={!!errors.capacity}
                aria-describedby={
                  errors.capacity ? "admin-capacity-error" : undefined
                }
              />
              <p className="text-sm text-slate-500">
                Each submitted application uses one space in this cohort.
              </p>
              {message("capacity")}
            </div>
            <div className="space-y-2">
              <label htmlFor="admin-closesAt" className="text-sm font-medium">
                Closing date and time
              </label>
              <AdminDatePicker
                id="admin-closesAt"
                label="Choose closing date and time"
                withTime
                value={cohortForm.closesAt}
                onChange={(value) =>
                  setCohortForm({ ...cohortForm, closesAt: value })
                }
                aria-invalid={!!errors.closesAt}
                aria-describedby={
                  errors.closesAt ? "admin-closesAt-error" : undefined
                }
              />
              <p className="text-sm text-slate-500">
                Kigali time (UTC+2). New open cohorts need a future deadline.
              </p>
              {message("closesAt")}
            </div>
            <label className="flex items-start gap-3 rounded-xl border p-4 text-sm">
              <Checkbox
                checked={cohortForm.isOpen}
                onCheckedChange={(value) =>
                  setCohortForm({ ...cohortForm, isOpen: value === true })
                }
              />
              <span>
                Open this cohort for applications
                <p className="mt-1 text-sm text-slate-500">
                  Applicants choose this cohort inside its program.
                </p>
              </span>
            </label>
            {saveError && (
              <p role="alert" className="text-sm text-red-700">
                {saveError}
              </p>
            )}
            <DialogFooter className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setCohortProgram(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 animate-spin" size={16} />
                ) : null}
                Save cohort
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !saving) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {deleting?.cohort ? "cohort" : "program"}?
            </DialogTitle>
            <DialogDescription>
              Only empty records can be deleted. Close a cohort with
              applications instead.
            </DialogDescription>
          </DialogHeader>
          {saveError && (
            <p role="alert" className="text-sm text-red-700">
              {saveError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={saving} onClick={remove}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
