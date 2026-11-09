"use client";
import { useId, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  Users,
  Clock3,
  CheckCircle2,
  Flag,
  ChartNoAxesCombined,
  Globe2,
  CircleHelp,
  ArrowUpRight,
} from "lucide-react";
import {
  cohortName,
  kigaliDay,
  summarizeAdminApplications,
  type AdminApplicationRow,
} from "@/lib/admin-applications";
import styles from "./admin.module.css";
import MetricTrend, { ChartHoverCard, DataTrendLine, type ChartAnchor } from "./metric-trend";

function PipelineStage({ status, count, total, months, counts }: {
  status: string; count: number; total: number; months: string[]; counts: number[];
}) {
  const label = status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  return (
    <div className={styles.barRow}>
      <div>
        <span>{label}</span>
        <strong className="text-right">{count.toLocaleString()} applications
          <small className="block text-xs font-normal text-slate-500">{Math.round(count / Math.max(1, total) * 100)}% of matching applications</small>
        </strong>
      </div>
      <div className={styles.pipelineStage}><DataTrendLine counts={counts} months={months} label={label} /></div>
    </div>
  );
}

function SubmissionActivity({ rows, firstMonth }: { rows: AdminApplicationRow[]; firstMonth: string }) {
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const tooltipId = useId();
  const [hover, setHover] = useState<{ index: number; anchor: ChartAnchor } | null>(null);
  const [focusedDay, setFocusedDay] = useState<number | null>(null);
  const calendar = useMemo(() => {
    const daily: Record<string, number> = {};
    for (const row of rows) {
      const day = kigaliDay(row.createdAt);
      if (day) daily[day] = (daily[day] ?? 0) + 1;
    }
    const lastDay = Object.keys(daily).sort().at(-1);
    if (!lastDay) return null;
    const start = new Date(`${firstMonth}-01T00:00:00Z`);
    const end = new Date(`${lastDay}T00:00:00Z`);
    const formatter = new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
    });
    const days = Array.from({ length: Math.round((end.getTime() - start.getTime()) / 86400000) + 1 }, (_, index) => {
      const date = new Date(start.getTime() + index * 86400000);
      const day = date.toISOString().slice(0, 10);
      const count = daily[day] ?? 0;
      const formattedDate = formatter.format(date);
      return { day, date, count, formattedDate, caption: `${count.toLocaleString()} ${count === 1 ? "submission" : "submissions"} on ${formattedDate}` };
    });
    const offset = start.getUTCDay();
    return { days, offset, weeks: Math.ceil((offset + days.length) / 7),
      max: Math.max(1, ...days.map(({ count }) => count)),
      visibleTotal: days.reduce((sum, { count }) => sum + count, 0),
      startLabel: formatter.format(start), endLabel: formatter.format(end) };
  }, [rows, firstMonth]);
  if (!calendar) return <p className={styles.empty}>No submission dates available.</p>;
  const { days, offset, weeks, max, visibleTotal, startLabel, endLabel } = calendar;
  const currentHover = hover && hover.index < days.length ? hover : null;
  const showDay = (index: number) => {
    const cell = cells.current[index];
    if (!cell) return;
    const bounds = cell.getBoundingClientRect();
    const anchor = { x: bounds.left + bounds.width / 2, y: bounds.bottom };
    setHover((previous) => previous?.index === index && previous.anchor.x === anchor.x && previous.anchor.y === anchor.y
      ? previous : { index, anchor });
  };
  const selectDay = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const column = Math.max(0, Math.min(weeks - 1, Math.floor((event.clientX - bounds.left) / ((bounds.width + 3) / weeks))));
    const row = Math.max(0, Math.min(6, Math.floor((event.clientY - bounds.top) / 15)));
    showDay(Math.max(0, Math.min(days.length - 1, column * 7 + row - offset)));
  };
  return (
    <div className={styles.activity}>
      <div className={styles.activitySummary}>
        <b>{visibleTotal.toLocaleString()} submissions</b>
        <span>{startLabel} – {endLabel}</span>
      </div>
      <div className={styles.activityScroll}>
        <div className={styles.activityCalendar}>
          <div className={styles.activityMonths} style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }} aria-hidden="true">
            {days.filter(({ date }) => date.getUTCDate() === 1).map(({ day, date }) => {
              const index = days.findIndex((item) => item.day === day);
              return <span key={day} style={{ gridColumn: Math.floor((offset + index) / 7) + 1 }}>
                {new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(date)}
              </span>;
            })}
          </div>
          <div className={styles.activityWeekdays} aria-hidden="true"><span>Mon</span><span>Wed</span><span>Fri</span></div>
            <div className={styles.activityGrid} style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }} aria-label="Daily application submissions"
              onPointerEnter={selectDay} onPointerMove={selectDay}
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                selectDay(event);
              }}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture(event.pointerId);
                if (event.pointerType !== "mouse") setHover(null);
              }}
              onPointerLeave={() => setHover(null)} onPointerCancel={() => setHover(null)}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHover(null); }}>
              {days.map(({ day, count, caption }, index) => {
                const level = count === 0 ? 0 : Math.ceil(count / max * 4);
                return (
                      <button key={day} type="button" className={styles.activityCell} data-level={level} data-active={currentHover?.index === index}
                        ref={(element) => { cells.current[index] = element; }}
                        tabIndex={index === (focusedDay ?? days.length - 1) ? 0 : -1}
                        onFocus={() => { setFocusedDay(index); showDay(index); }}
                        onKeyDown={(event) => {
                          const moves: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
                          if (!(event.key in moves) && event.key !== "Home" && event.key !== "End") return;
                          event.preventDefault();
                          const next = event.key === "Home" ? 0 : event.key === "End" ? days.length - 1 : Math.max(0, Math.min(days.length - 1, index + moves[event.key]));
                          cells.current[next]?.focus();
                        }}
                        style={{ gridColumn: Math.floor((offset + index) / 7) + 1, gridRow: (offset + index) % 7 + 1 }}
                        aria-label={caption} aria-describedby={currentHover?.index === index ? tooltipId : undefined} />

                );
              })}
            </div>

        </div>
      </div>
      {currentHover && <ChartHoverCard anchor={currentHover.anchor} id={tooltipId}>
        <div className={styles.chartTooltipHeading}><span>Daily activity</span><b>{days[currentHover.index].formattedDate}</b></div>
        <div className={styles.chartTooltipValue}>{days[currentHover.index].count.toLocaleString()}<span>submissions</span></div>
        <p>Matching applications · Kigali time</p>
      </ChartHoverCard>}
      <div className={styles.activityFooter}>
        <span>Each square is one day</span>
        <div className={styles.activityLegend} aria-label="Light blue to near-black indicates increasing submission counts">
          <span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} className={styles.activityCell} data-level={level} aria-hidden="true" />)}<span>More</span>
        </div>
      </div>
    </div>
  );
}

function ProgramActivity({ name, count, total, days, counts }: {
  name: string; count: number; total: number; days: { day: string; label: string }[]; counts: number[];
}) {
  const tooltipId = useId();
  const strip = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ index: number; anchor: ChartAnchor } | null>(null);
  const max = Math.max(1, ...counts);
  const showDay = (index: number) => {
    if (!strip.current) return;
    const bounds = strip.current.getBoundingClientRect();
    const anchor = { x: bounds.left + (index + .5) / days.length * bounds.width, y: bounds.bottom };
    setHover((previous) => previous?.index === index && previous.anchor.x === anchor.x && previous.anchor.y === anchor.y
      ? previous : { index, anchor });
  };
  const selectDay = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - bounds.left) / Math.max(1, bounds.width);
    showDay(Math.max(0, Math.min(days.length - 1, Math.floor(fraction * days.length))));
  };
  return (
    <div className={styles.programActivity}>
      <div className={styles.programActivityHeading}>
        <span>{name}</span>
        <div><b>{count.toLocaleString()} applications</b><small>{Math.round(count / Math.max(1, total) * 100)}% of matching applications</small></div>
      </div>
      {days.length ? <>
        <div ref={strip} className={styles.programActivityStrip} tabIndex={0}
          aria-label={`${name}: 90 days of submission activity. Use left and right arrow keys for daily counts.`}
          aria-describedby={hover ? tooltipId : undefined}
          onPointerEnter={selectDay} onPointerMove={selectDay}
          onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); selectDay(event); }}
          onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); if (event.pointerType !== "mouse") setHover(null); }}
          onPointerLeave={() => setHover(null)} onPointerCancel={() => setHover(null)}
          onFocus={() => showDay(days.length - 1)} onBlur={() => setHover(null)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
            event.preventDefault();
            const index = event.key === "Home" ? 0 : event.key === "End" ? days.length - 1
              : Math.max(0, Math.min(days.length - 1, (hover?.index ?? days.length - 1) + (event.key === "ArrowLeft" ? -1 : 1)));
            showDay(index);
          }}>
          {days.map(({ day }, index) => <i key={day} className={styles.activityCell}
            data-level={counts[index] === 0 ? 0 : Math.ceil(counts[index] / max * 4)} data-active={hover?.index === index} aria-hidden="true" />)}
        </div>
        <div className={styles.programActivityDates}><span>{days[0].label}</span><i aria-hidden="true" /><span>{days[days.length - 1].label}</span></div>
        {hover && <ChartHoverCard anchor={hover.anchor} id={tooltipId}>
          <div className={styles.chartTooltipHeading}><span>{name}</span><b>{days[hover.index].label}</b></div>
          <div className={styles.chartTooltipValue}>{counts[hover.index].toLocaleString()}<span>submissions</span></div>
          <p>{counts[hover.index] === 0 ? "No matching applications submitted on this day." : "Matching applications submitted on this day."}</p>
          <div className={styles.chartTooltipFootnote}>Submission date · Kigali time</div>
        </ChartHoverCard>}
      </> : <p className={styles.note}>Submission dates unavailable.</p>}
    </div>
  );
}

function ProgramBreakdown({ rows }: { rows: AdminApplicationRow[] }) {
  const data = useMemo(() => {
    const programs = new Map<string, { name: string; count: number; daily: Record<string, number> }>();
    let lastDay = "";
    for (const row of rows) {
      const id = row.course?.id ?? "unknown";
      const program = programs.get(id) ?? { name: row.course?.name ?? "Data not available", count: 0, daily: {} };
      program.count++;
      const day = kigaliDay(row.createdAt);
      if (day) { program.daily[day] = (program.daily[day] ?? 0) + 1; if (day > lastDay) lastDay = day; }
      programs.set(id, program);
    }
    const formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    const end = lastDay ? new Date(`${lastDay}T00:00:00Z`).getTime() : 0;
    const days = lastDay ? Array.from({ length: 90 }, (_, index) => {
      const date = new Date(end - (89 - index) * 86400000);
      return { day: date.toISOString().slice(0, 10), label: formatter.format(date) };
    }) : [];
    return { days, programs: [...programs.entries()].sort((a, b) => b[1].count - a[1].count) };
  }, [rows]);
  return data.programs.length ? <>
    <p className={styles.note}>Daily submissions over 90 days ending with the latest matching submission. Darker segments show more activity.</p>
    {data.programs.map(([id, program]) => <ProgramActivity key={`${id}:${data.days.at(-1)?.day}`} name={program.name} count={program.count} total={rows.length}
      days={data.days} counts={data.days.map(({ day }) => program.daily[day] ?? 0)} />)}
  </> : <p className={styles.empty}>Data not available for these filters.</p>;
}

function entryWebsiteUrl(source: string) {
  if (source === "Data not available") return null;
  try {
    const url = new URL(source.includes("://") ? source : `https://${source}`);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password ? url : null;
  } catch { return null; }
}

function WebsiteFavicon({ source }: { source: string }) {
  const [failed, setFailed] = useState(false);
  const url = entryWebsiteUrl(source);
  if (!url) return <CircleHelp size={17} aria-hidden="true" />;
  return failed ? <Globe2 size={17} aria-hidden="true" /> : (
    <img src={`${url.origin}/favicon.ico`} alt="" width={22} height={22} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  );
}

function EntryWebsiteBreakdown({ sources, total }: { sources: Record<string, number>; total: number }) {
  const entries = Object.entries(sources).sort((a, b) => b[1] - a[1]);
  const tooltipId = useId();
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [hover, setHover] = useState<{ source: string; anchor: ChartAnchor } | null>(null);
  const selected = entries.find(([source]) => source === selectedSource) ?? entries[0];
  if (!selected) return <p className={styles.empty}>Data not available for these filters.</p>;
  const showSource = (source: string, element: HTMLButtonElement) => {
    const bounds = element.getBoundingClientRect();
    setSelectedSource(source);
    setHover({ source, anchor: { x: bounds.left + bounds.width / 2, y: bounds.bottom } });
  };
  const hoveredCount = hover ? sources[hover.source] : undefined;
  const selectedUrl = entryWebsiteUrl(selected[0]);
  return (
    <div className={styles.entryWebsites} onPointerLeave={() => setHover(null)}>
      <p className={styles.note}>Hover a website icon to see its matching applications.</p>
      <div className={styles.websitePill}>
        <div className={styles.websiteIcons} aria-label="Entry websites">
          {entries.map(([source, count], index) => {
            return <button key={source} type="button" className={styles.websiteIcon} data-selected={source === selected[0]} data-tone={index % 3}
              aria-label={`${source}: ${count.toLocaleString()} applications`}
              aria-pressed={source === selected[0]} aria-describedby={hover?.source === source ? tooltipId : undefined}
              onPointerEnter={(event) => showSource(source, event.currentTarget)}
              onFocus={(event) => showSource(source, event.currentTarget)}
              onClick={(event) => showSource(source, event.currentTarget)}
              onBlur={() => setHover(null)}>
              <WebsiteFavicon source={source} />
            </button>;
          })}
        </div>
        {selectedUrl ? <a className={styles.websiteName} href={selectedUrl.href} target="_blank" rel="noopener noreferrer">
          <span>{selectedUrl.hostname}</span><ArrowUpRight size={14} aria-hidden="true" />
        </a> : <span className={styles.websiteName}>{selected[0]}</span>}
        <div className={styles.websiteTotal}>
          <b>{selected[1].toLocaleString()}</b>
          <span>applications</span>
          <small>{Math.round(selected[1] / Math.max(1, total) * 100)}% of matching</small>
        </div>
      </div>
      {hover && hoveredCount !== undefined && <ChartHoverCard id={tooltipId} anchor={hover.anchor}>
        <div className={styles.chartTooltipHeading}><span>Entry website</span></div>
        <p className={styles.websiteTooltipName}>{hover.source}</p>
        <div className={styles.chartTooltipValue}>{hoveredCount.toLocaleString()}<span>applications</span></div>
        <p>{Math.round(hoveredCount / Math.max(1, total) * 100)}% of {total.toLocaleString()} matching applications.</p>
        {hover.source === "Data not available" && <div className={styles.chartTooltipFootnote}>These applications have no recorded entry website.</div>}
      </ChartHoverCard>}
    </div>
  );
}

export default function ApplicationAnalytics({
  rows,
  total,
}: {
  rows: AdminApplicationRow[];
  total: number;
}) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const data = summarizeAdminApplications(rows);
  const monthlyStatuses = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const month = kigaliDay(row.createdAt).slice(0, 7);
    const statuses = monthlyStatuses.get(month) ?? {};
    statuses[row.status] = (statuses[row.status] ?? 0) + 1;
    monthlyStatuses.set(month, statuses);
  }
  const statusCounts = (status: string) => data.trend.map(({ month }) => monthlyStatuses.get(month)?.[status] ?? 0);
  const metrics = [
    {
      label: "Matching applications",
      value: data.total,
      note: `${total.toLocaleString()} across all records`,
      icon: Users,
      counts: data.trend.map(({ count }) => count),
    },
    {
      label: "Under review",
      value: data.underReview,
      note: "Awaiting initial review",
      icon: Clock3,
      counts: statusCounts("UNDER_REVIEW"),
    },
    {
      label: "Accepted",
      value: data.accepted,
      note: `${data.total ? Math.round((data.accepted / data.total) * 100) : 0}% of matching applications`,
      icon: CheckCircle2,
      counts: statusCounts("ACCEPTED"),
    },
    {
      label: "Needs follow-up",
      value: data.followUp,
      note: "Marked for further action",
      icon: Flag,
      counts: statusCounts("NEEDS_FOLLOW_UP"),
    },
  ];
  const bars = (entries: [string, number][]) =>
    entries.length ? (
      entries.map(([label, count], index) => (
        <div className={styles.barRow} key={`${label}-${index}`}>
          <div>
            <span>{label}</span>
            <strong className="text-right">
              {count.toLocaleString()} applications
              <small className="block text-xs font-normal text-slate-500">
                {Math.round((count / Math.max(1, data.total)) * 100)}% of
                matching applications
              </small>
            </strong>
          </div>
          <div className={styles.track} aria-hidden="true">
            <i
              style={{ width: `${(count / Math.max(1, data.total)) * 100}%` }}
            />
          </div>
        </div>
      ))
    ) : (
      <p className={styles.empty}>Data not available for these filters.</p>
    );
  return (
    <section
      aria-label="Application analytics"
      className={styles.insightsPanel}
    >
      <details open>
        <summary className={styles.insightsHeading}>
          <ChartNoAxesCombined size={40} aria-hidden="true" />
          <div>
            <h2>Application insights</h2>
            <p>
              Understand your applicants, review progress, and submission
              trends.
            </p>
          </div>
        </summary>
        <div className="space-y-5 p-5">
          <p className={styles.note}>
            {data.total.toLocaleString()} applications match your filters.{" "}
            {data.underReview.toLocaleString()} are awaiting initial review;{" "}
            {data.accepted.toLocaleString()} have been accepted.
          </p>
          <div className={styles.metrics}>
            {metrics.map(({ label, value, note, counts, icon: Icon }) => (
              <article className={`${styles.metric} ${styles.analyticsMetric}`} key={label}
                onMouseEnter={() => setHoveredMetric(label)} onMouseLeave={() => setHoveredMetric(null)}>
                <span>
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </span>
                <div className={styles.metricBody}>
                  <strong>{value.toLocaleString()}</strong>
                  <MetricTrend active={hoveredMetric === label} label={label} counts={counts} months={data.trend.map(({ month }) => month)} />
                </div>
                <small>{note}</small>
              </article>
            ))}
          </div>
          <div className={styles.charts}>
            <article className={styles.panel}>
              <h2>Application pipeline</h2>
              <p className={styles.note}>
                How many matching applicants are at each review stage.
                Percentages use the matching total above. Lines show monthly submissions by current status; hover along a line for details.
              </p>
              {data.total ? Object.entries(data.statuses)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <PipelineStage key={status} status={status} count={count} total={data.total}
                    months={data.trend.map(({ month }) => month)} counts={statusCounts(status)} />
                )) : <p className={styles.empty}>Data not available for these filters.</p>}

            </article>
            <article className={styles.panel}>
              <h2>Submission trend</h2>
              <p className={styles.note}>
                Daily submission activity over the latest 12-month window · Kigali time.
              </p>
              {data.trend.length ? (
                <SubmissionActivity rows={rows} firstMonth={data.trend[0].month} />
              ) : <p className={styles.empty}>Data not available for these filters.</p>}

            </article>
          </div>
          <details className={styles.disclosure}>
            <summary>
              Program, cohort & referral breakdowns
              <small>Explore where matching applications come from</small>
            </summary>
            <div className={`${styles.charts} ${styles.breakdowns}`}>
              <article className={styles.panel}>
                <h2>Applications by program</h2>
                <ProgramBreakdown rows={rows} />
              </article>
              <div className={styles.breakdownColumn}>
              <article className={styles.panel}>
                <h2>Applications by entry website</h2>
                <EntryWebsiteBreakdown sources={data.sources} total={data.total} />
              </article>
              <article className={styles.panel}>
                <h2>Applications by cohort</h2>
                {bars(
                  Object.entries(data.cohorts)
                    .sort((a, b) =>
                      a[0].localeCompare(b[0], "en", { numeric: true }),
                    )
                    .map(([name, count]) => [cohortName(name), count]),
                )}
              </article>
              </div>
            </div>
          </details>
        </div>
      </details>
    </section>
  );
}
