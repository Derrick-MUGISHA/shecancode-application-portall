"use client"

import { Skeleton } from "boneyard-js/react"
import type { AnyBone, SkeletonResult } from "boneyard-js"
import { usePathname } from "next/navigation"
import styles from "./admin.module.css"
import loadingStyles from "./admin-skeletons.module.css"

export type AdminLoadingKind = "applications" | "programs" | "emails" | "application-details" | "email-details" | "email-form"
type Rect = [number, number, number, number, number]

// Explicit layouts also render during SSR, before Boneyard's ResizeObserver runs.
// All values are decorative placeholders, never applicant or email fixtures.
function Bones({ name, height, bones }: { name: string; height: number; bones: Rect[] }) {
  const layout: SkeletonResult = { name, width: 1000, viewportWidth: 1280, height, bones: bones as AnyBone[] }
  return <div aria-hidden="true" className={loadingStyles.block}>
    <Skeleton name={name} loading initialBones={layout} color="#dce5ee" darkColor="#334155" animate="pulse"
      fallback={<div className={loadingStyles.fallback} style={{ height }}>{bones.map(([x, y, w, h, r], index) =>
        <i key={index} style={{ left: `${x}%`, top: y, width: `${w}%`, height: h, borderRadius: r }} />)}</div>}>
      {null}
    </Skeleton>
  </div>
}

function HeadingSkeleton() {
  return <Bones name="admin-heading" height={96} bones={[[0,0,16,10,3],[0,24,28,30,5],[0,68,45,14,3],[84,22,16,40,8]]} />
}

export function MetricCardsSkeleton({ count = 3 }: { count?: number }) {
  return <div className={`${styles.metrics} ${count === 3 ? styles.metricsThree : ""}`}>
    {Array.from({ length: count }, (_, index) => <div key={index} className={styles.metric}>
      <Bones name="admin-metric-card" height={162} bones={[[0,0,40,14,4],[0,48,15,42,5],[50,36,50,58,5],[75,108,25,12,3],[73,128,27,10,3],[0,148,68,12,3]]} />
    </div>)}
  </div>
}

export function FiltersSkeleton() {
  return <div className={loadingStyles.filters}>
    {[45,20,20,15].map((width, index) => <div key={index} style={{ flex: `${width} 1 120px` }}>
      <Bones name="admin-filter" height={40} bones={[[0,0,100,40,8]]} />
    </div>)}
  </div>
}

export function TableSkeleton({ rows = 5, heading = true }: { rows?: number; heading?: boolean }) {
  const bones: Rect[] = [[2,14,22,12,3],[41,14,15,12,3],[67,14,10,12,3],[86,14,10,12,3]]
  for (let row = 0; row < rows; row++) {
    const y = 60 + row * 70
    bones.push([2,y,4,32,16],[8,y+1,24,13,3],[8,y+23,20,11,3],[41,y+5,19,13,3],[67,y+5,11,23,5],[87,y+3,9,28,5])
  }
  return <div>
    {heading && <Bones name="admin-table-heading" height={76} bones={[[0,0,24,20,4],[0,34,38,12,3],[84,5,16,36,7]]} />}
    <div className={styles.tableScroll}><div style={{ minWidth: 850 }}>
      <Bones name="admin-table-rows" height={48+rows*70} bones={bones} />
    </div></div>
    <Bones name="admin-pagination" height={64} bones={[[0,22,20,12,3],[64,14,14,32,6],[81,14,19,32,6]]} />
  </div>
}

function ChartSkeleton({ activity = false }: { activity?: boolean }) {
  const bones: Rect[] = [[0,0,35,20,4],[0,34,85,12,3]]
  if (activity) {
    bones.push([0,71,25,12,3],[65,71,35,12,3])
    for (let col=0; col<48; col++) for(let row=0; row<7; row++) bones.push([col*2.08,109+row*15,1.5,12,2])
    bones.push([0,231,25,10,3],[76,231,24,10,3])
  } else {
    bones.push([0,78,20,12,3],[80,78,20,12,3],[0,110,100,42,5],[0,174,22,12,3],[80,174,20,12,3],[0,206,100,42,5])
  }
  return <div className={styles.panel}><Bones name={activity ? "admin-submission-activity" : "admin-pipeline"} height={264} bones={bones} /></div>
}

export function AnalyticsSkeleton() {
  return <div className={styles.insightsPanel}>
    <div className={loadingStyles.analyticsHeading}><Bones name="admin-insights-heading" height={52} bones={[[0,0,4,36,5],[6,0,25,20,4],[6,30,55,12,3]]} /></div>
    <div className={loadingStyles.analyticsBody}>
      <Bones name="admin-insights-note" height={20} bones={[[0,0,72,12,3]]} />
      <MetricCardsSkeleton count={4} />
      <div className={styles.charts}><ChartSkeleton /><ChartSkeleton activity /></div>
      <Bones name="admin-breakdown-disclosure" height={54} bones={[[0,0,100,54,10]]} />
    </div>
  </div>
}

export function ProgramListSkeleton() {
  return <div className={styles.programList}>
    {[0,1,2].map(index => <div className={styles.program} key={index}>
      <div className={styles.programTop}><div className={loadingStyles.fullWidth}>
        <Bones name="admin-program-header" height={64} bones={[[0,0,34,20,4],[0,36,28,12,3],[60,8,12,36,6],[74,8,12,36,6],[88,8,12,36,6]]} />
      </div></div>
      {index === 0 && <div className={styles.cohortArea}><TableSkeleton rows={2} /></div>}
    </div>)}
  </div>
}

function SummarySkeleton() {
  return <div className={styles.summaryCard}>
    <div className={loadingStyles.summaryPadding}>
      <Bones name="admin-summary-heading" height={52} bones={[[0,0,55,18,4],[78,0,22,30,6]]} />
      {Array.from({length:8},(_,index)=><Bones key={index} name="admin-summary-field" height={39} bones={[[0,10,22,11,3],[32,8,index===0?44:60,14,3]]} />)}
    </div>
  </div>
}

function InformationSkeleton({ fields = 6 }: { fields?: number }) {
  return <div className={styles.panel}>
    <Bones name="admin-information-heading" height={48} bones={[[0,0,35,22,4]]} />
    <div className={loadingStyles.informationGrid}>
      {Array.from({length:fields},(_,index)=><div className={loadingStyles.informationField} key={index}>
        <Bones name="admin-information-field" height={58} bones={[[0,0,35,12,3],[0,29,74,15,3]]} />
      </div>)}
    </div>
  </div>
}

function ApplicationDetailsSkeleton() {
  return <>
    <div className={styles.detailTabsRow}><Bones name="admin-application-tabs" height={44} bones={[[0,10,42,18,4],[53,10,42,18,4]]} /></div>
    <div className={styles.detailLayout}>
      <div className={loadingStyles.sections}><InformationSkeleton fields={8} /><InformationSkeleton fields={2} /><InformationSkeleton /></div>
      <SummarySkeleton />
    </div>
  </>
}

function EmailFormSkeleton() {
  return <div className={`${styles.panel} ${loadingStyles.sections}`}>
    <Bones name="admin-email-form-subject" height={76} bones={[[0,0,12,12,3],[0,26,100,42,7]]} />
    <div className={loadingStyles.informationGrid}>{[0,1].map(index=><Bones key={index} name="admin-email-form-select" height={76} bones={[[0,0,20,12,3],[0,26,100,42,7]]} />)}</div>
    <Bones name="admin-email-editor" height={280} bones={[[0,0,12,12,3],[0,28,100,38,6],[0,80,95,12,3],[0,108,88,12,3],[0,136,92,12,3],[0,164,66,12,3],[0,226,100,42,7]]} />
  </div>
}

export function AdminPageContentSkeleton({ kind }: { kind: AdminLoadingKind }) {
  return <div className={`${styles.workspace} ${loadingStyles.loading}`} role="status" aria-busy="true">
    <span className="sr-only">Loading {kind.replaceAll("-", " ")}…</span>
    <HeadingSkeleton />
    {kind === "applications" ? <><AnalyticsSkeleton /><FiltersSkeleton /><TableSkeleton /></>
      : kind === "programs" ? <><MetricCardsSkeleton /><FiltersSkeleton /><ProgramListSkeleton /></>
      : kind === "emails" ? <><MetricCardsSkeleton /><FiltersSkeleton /><TableSkeleton /></>
      : kind === "application-details" ? <ApplicationDetailsSkeleton />
      : kind === "email-form" ? <EmailFormSkeleton />
      : <><InformationSkeleton fields={4} /><EmailFormSkeleton /></>}
  </div>
}

export function AdminPageSkeleton({ kind }: { kind: AdminLoadingKind }) {
  return <div className={loadingStyles.page}>
    <div className={loadingStyles.nav} aria-hidden="true">
      <img src="/logo.png" width={76} height={55} alt="" />
      <div className={loadingStyles.navItems}><Bones name="admin-navigation" height={40} bones={[[0,0,31,40,8],[34,0,31,40,8],[68,0,32,40,8]]} /></div>
      <div className={loadingStyles.navAction}><Bones name="admin-nav-action" height={38} bones={[[0,0,100,38,7]]} /></div>
    </div>
    <main className={loadingStyles.main}><AdminPageContentSkeleton kind={kind} /></main>
  </div>
}

export function AdminAuthSkeleton() {
  const pathname = usePathname()
  const kind: AdminLoadingKind = pathname.startsWith("/admin/courses") ? "programs"
    : pathname === "/admin/emails/new" ? "email-form"
    : pathname.startsWith("/admin/emails/") ? "email-details"
    : pathname.startsWith("/admin/emails") ? "emails"
    : pathname.startsWith("/admin/applications/") ? "application-details" : "applications"
  return <AdminPageSkeleton kind={kind} />
}
