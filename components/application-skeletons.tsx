"use client"

import { Skeleton } from "boneyard-js/react"
import type { SkeletonResult } from "boneyard-js"
import ApplicationShell from "./application-shell"
import wizard from "./application-wizard.module.css"
import styles from "./application-skeletons.module.css"

type Rect = [number, number, number, number, number]
function Bones({ name, height, bones }: { name: string; height: number; bones: Rect[] }) {
  const layout: SkeletonResult = { name, width: 1000, viewportWidth: 1280, height, bones }
  return <div className={styles.bones} aria-hidden="true">
    <Skeleton name={name} loading initialBones={layout} color="#d7e3ee" darkColor="#334155" animate="pulse"
      fallback={<div className={styles.fallback} style={{ height }}>{bones.map(([x,y,w,h,r], index) =>
        <i key={index} style={{ left: `${x}%`, top: y, width: `${w}%`, height: h, borderRadius: r }} />)}</div>}>
      {null}
    </Skeleton>
  </div>
}

export function ApplicationEntrySkeleton() {
  return <div className={`${styles.loading} ${styles.entry}`} role="status" aria-busy="true">
    <h1 className="text-2xl font-semibold text-slate-800">Opening your application…</h1>
    <p className="mt-3 text-sm text-slate-600">Checking your entry link and available programs. Please wait.</p>
  </div>
}

export function ApplicationProgressSkeleton() {
  return <div className={`${styles.loading} ${styles.progress}`} aria-hidden="true">
    {[0,1,2,3].map(index => <div className={styles.progressStep} key={index}>
      <span className={styles.progressCircle} />
      <div className={styles.progressLabel}><Bones name="applicant-progress-step" height={44} bones={[[0,4,85,13,3],[0,28,56,10,3]]} /></div>
    </div>)}
  </div>
}

export function ProgramSelectionSkeleton() {
  return <div className={styles.loading} role="status" aria-busy="true">
    <span className="sr-only">Loading available programs and cohorts…</span>
    <Bones name="applicant-program-legend" height={38} bones={[[30,5,40,12,3]]} />
    <div className={styles.programs}>{[0,1,2].map(index => <div className={styles.programCard} key={index}>
      <Bones name="applicant-program-card" height={162} bones={[[0,0,35,14,4],[74,0,26,18,5],[8,43,84,20,4],[18,75,64,14,3],[20,118,60,11,3],[8,142,84,12,3]]} />
    </div>)}</div>
  </div>
}

export function ApplicationFieldSkeleton({ label }: { label: string }) {
  return <div className={`${styles.loading} ${styles.fieldLoading}`} role="status" aria-busy="true">
    <span className="sr-only">Loading {label.toLowerCase()}…</span>
    <Bones name="applicant-location-field" height={44} bones={[[0,0,100,44,8]]} />
  </div>
}

export function ApplicationFormSkeleton({ step = 0 }: { step?: number }) {
  return <div className={`${wizard.formCard} ${styles.loading}`} role="status" aria-busy="true">
    <span className="sr-only">Loading application form and saved answers…</span>
    <div className={wizard.formBody}>
      <Bones name="applicant-step-heading" height={124} bones={[[41,0,18,10,3],[20,26,60,28,5],[8,76,84,13,3],[20,99,60,12,3]]} />
      {step === 0 ? <ProgramSelectionSkeleton /> : <div className={styles.fields}>
        {Array.from({ length: step === 3 ? 4 : 8 }, (_, index) => <Bones key={index} name="applicant-form-field" height={84} bones={[[0,0,42,13,3],[0,29,100,44,8]]} />)}
      </div>}
      <div className={styles.footer}><Bones name="applicant-form-actions" height={80} bones={[[0,4,20,42,8],[75,4,25,42,8],[18,65,64,11,3]]} /></div>
    </div>
  </div>
}

export function ApplicationPageSkeleton() {
  return <ApplicationShell><div role="status" aria-busy="true" className={wizard.emptyState}>
    <h2>Checking available programs…</h2><p>Please wait while we prepare your application.</p>
  </div></ApplicationShell>
}
