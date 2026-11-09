"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import styles from "./admin.module.css";

export type ChartAnchor = { x: number; y: number };

export function ChartHoverCard({ anchor, id, children }: { anchor: ChartAnchor; id: string; children: ReactNode }) {
  const content = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setDismissed(false);
    const dismiss = () => setDismissed(true);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("keydown", escape);
    };
  }, [anchor.x, anchor.y]);
  const [size, setSize] = useState({ width: 264, height: 180 });
  useLayoutEffect(() => {
    if (!content.current) return;
    const bounds = content.current.getBoundingClientRect();
    setSize((previous) => previous.width === bounds.width && previous.height === bounds.height
      ? previous : { width: bounds.width, height: bounds.height });
  });
  const left = Math.max(16, Math.min(anchor.x - size.width / 2, window.innerWidth - size.width - 16));
  const below = anchor.y + 14 + size.height <= window.innerHeight - 16;
  const top = below ? anchor.y + 14 : Math.max(16, anchor.y - size.height - 14);
  if (dismissed) return null;
  return createPortal(
    <div ref={content} id={id} role="tooltip" className={styles.chartTooltip}
      data-side={below ? "bottom" : "top"} style={{ left, top }}>
      {children}
      <i className={styles.chartTooltipArrow} aria-hidden="true"
        style={{ left: Math.max(10, Math.min(size.width - 10, anchor.x - left)) }} />
    </div>, document.body,
  );
}

export function DataTrendLine({ counts, months, label, active = false, unit = "submissions", context }: {
  counts: number[]; months: string[]; label: string; active?: boolean; unit?: string; context?: string;
}) {
  const tooltipId = useId();
  const plot = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<ChartAnchor | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(counts.length - 1);
  const index = Math.max(0, Math.min(selectedIndex, counts.length - 1));
  const max = Math.max(1, ...counts);
  const selected = counts[index] ?? 0;
  const previous = index > 0 ? counts[index - 1] : null;
  const change = selected - (previous ?? 0);
  const xAt = (i: number) => i / Math.max(1, counts.length - 1) * 100;
  const yAt = (value: number) => 88 - value / max * 76;
  const open = active || hovered || focused;
  useLayoutEffect(() => {
    if (!open || !plot.current) return;
    const bounds = plot.current.getBoundingClientRect();
    const x = bounds.left + xAt(index) / 100 * bounds.width;
    const y = bounds.top + yAt(selected) / 100 * bounds.height;
    setAnchor((previous) => previous?.x === x && previous?.y === y ? previous : { x, y });
  });
  if (!months.length) return <small>No dated history available</small>;
  const selectPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width)));
    setSelectedIndex(Math.round(fraction * (counts.length - 1)));
    setHovered(true);
  };
  const monthLabel = (month: string) => new Intl.DateTimeFormat("en-GB", {
    month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));

  return (
    <>
        <div ref={plot} className={styles.dataTrendLine} tabIndex={0}
          aria-label={`${label}: monthly ${unit}. Use left and right arrow keys to explore.`}
          aria-describedby={open ? tooltipId : undefined}
          onPointerEnter={selectPointer} onPointerMove={selectPointer}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            selectPointer(event);
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
            if (event.pointerType !== "mouse") setHovered(false);
          }}
          onPointerCancel={() => setHovered(false)}
          onPointerLeave={() => { setHovered(false); setSelectedIndex(counts.length - 1); }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            setSelectedIndex(Math.max(0, Math.min(counts.length - 1, index + (event.key === "ArrowLeft" ? -1 : 1))));
          }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={counts.map((value, i) => `${xAt(i)},${yAt(value)}`).join(" ")} className={styles.pipelinePulse} />
          </svg>
          {open && <span className={styles.chartGuide} style={{ left: `${xAt(index)}%` }} aria-hidden="true" />}
          <span className={styles.chartPoint} data-active={open} aria-hidden="true"
              style={{ left: `${xAt(index)}%`, top: `${yAt(selected)}%` }} />
        </div>
        {open && anchor && <ChartHoverCard anchor={anchor} id={tooltipId}>
            <div className={styles.chartTooltipHeading}><span>{label}</span><b>{monthLabel(months[index])}</b></div>
            <div className={styles.chartTooltipValue}>{selected.toLocaleString()}<span>{unit}</span></div>
            <p>{previous === null ? "First month shown; no previous month to compare." : change === 0
              ? `Unchanged from ${monthLabel(months[index - 1])} (${previous.toLocaleString()}).`
              : `${Math.abs(change).toLocaleString()} ${change > 0 ? "more" : "fewer"} than ${monthLabel(months[index - 1])} (${previous.toLocaleString()}). ${change > 0 ? "Higher" : "Lower"} counts produce a ${change > 0 ? "higher" : "lower"} point.`}</p>
            <div className={styles.chartTooltipFootnote}>{context ?? `Submission date · Kigali time${label !== "Matching applications" ? " · current status" : ""}`}{index === months.length - 1 ? ". Latest month may be incomplete." : "."}</div>
        </ChartHoverCard>}
    </>
  );
}

export default function MetricTrend({ counts, months, label, active, unit, context }: { counts: number[]; months: string[]; label: string; active: boolean; unit?: string; context?: string }) {
  const current = counts.at(-1) ?? 0;
  const previous = counts.at(-2) ?? 0;
  const change = current - previous;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const changeLabel = change === 0 ? "No change" : previous === 0
    ? `+${current.toLocaleString()} from zero`
    : `${change > 0 ? "+" : "−"}${Math.abs(change / previous * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  return (
    <div className={styles.metricTrend} data-direction={direction}>
      <DataTrendLine counts={counts} months={months} label={label} active={active} unit={unit} context={context} />
      <div className={styles.metricChange}><Icon size={14} aria-hidden="true" /><span>{changeLabel}</span></div>
      <small>vs previous month</small>
    </div>
  );
}

