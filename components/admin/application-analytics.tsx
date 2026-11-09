"use client"
import { Users, Clock3, CheckCircle2, Flag } from "lucide-react"
import { cohortName, summarizeAdminApplications, type AdminApplicationRow } from "@/lib/admin-applications"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import styles from "./admin.module.css"

export default function ApplicationAnalytics({ rows, total }: { rows: AdminApplicationRow[]; total: number }) {
  const data = summarizeAdminApplications(rows)
  const maxTrend = Math.max(1,...data.trend.map(item=>item.count))
  const metrics = [
    { label: "Matching applications", value: data.total, note: `${total.toLocaleString()} across all records`, icon: Users },
    { label: "Under review", value: data.underReview, note: "Awaiting initial review", icon: Clock3 },
    { label: "Accepted", value: data.accepted, note: `${data.total ? Math.round(data.accepted / data.total * 100) : 0}% of matching applications`, icon: CheckCircle2 },
    { label: "Needs follow-up", value: data.followUp, note: "Marked for further action", icon: Flag },
  ]
  const bars = (entries: [string,number][]) => entries.length ? entries.map(([label,count],index)=><div className={styles.barRow} key={`${label}-${index}`}>
    <div><span>{label}</span><strong>{count.toLocaleString()} · {Math.round(count / Math.max(1,data.total)*100)}%</strong></div>
    <div className={styles.track} aria-hidden="true"><i style={{width: `${count/Math.max(1,data.total)*100}%`}} /></div>
  </div>) : <p className={styles.empty}>Data not available for these filters.</p>
  return <section aria-label="Application analytics" className="space-y-4">
    <div className={styles.metrics}>{metrics.map(({label,value,note,icon:Icon})=><article className={styles.metric} key={label}><span><Icon size={15} aria-hidden="true" />{label}</span><strong>{value.toLocaleString()}</strong><small>{note}</small></article>)}</div>
    <div className={styles.charts}>
      <article className={styles.panel}><h2>Application pipeline</h2><p className={styles.note}>Status distribution for the current filters.</p>{bars(Object.entries(data.statuses).sort((a,b)=>b[1]-a[1]).map(([name,count])=>[name.replaceAll('_',' ').toLowerCase(),count]))}</article>
      <article className={styles.panel}><h2>Submission trend</h2><p className={styles.note}>12 months ending with the latest matching submission · Kigali time.</p>{data.trend.length ? <div className={styles.trend}>{data.trend.map(item=>{
        const month=new Intl.DateTimeFormat("en-GB",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${item.month}-01T00:00:00Z`))
        const caption=`${month}: ${item.count.toLocaleString()} submitted applications matching your filters, grouped by submission date in Kigali time.`
        return <TooltipProvider key={item.month} delayDuration={100}><Tooltip><TooltipTrigger asChild><div tabIndex={0} aria-label={caption} className={styles.trendBar}><b>{item.count}</b><i aria-hidden="true" style={{height:`${item.count/maxTrend*95}px`,minHeight:item.count?3:1}} /><small>{new Intl.DateTimeFormat("en-GB",{month:"short",timeZone:"UTC"}).format(new Date(`${item.month}-01T00:00:00Z`))}<br/>{item.month.slice(0,4)}</small></div></TooltipTrigger><TooltipContent className="max-w-64 bg-white text-sm text-slate-800">{caption}</TooltipContent></Tooltip></TooltipProvider>
      })}</div> : <p className={styles.empty}>Data not available for these filters.</p>}</article>
      <article className={styles.panel}><h2>Applications by program</h2>{bars(Object.values(data.programs).sort((a,b)=>b.count-a.count).map(item=>[item.name,item.count]))}</article>
      <article className={styles.panel}><h2>Applications by entry website</h2>{bars(Object.entries(data.sources).sort((a,b)=>b[1]-a[1]))}</article>
      <article className={styles.panel}><h2>Applications by cohort</h2>{bars(Object.entries(data.cohorts).sort((a,b)=>a[0].localeCompare(b[0],'en',{numeric:true})).map(([name,count])=>[cohortName(name),count]))}</article>
    </div>
  </section>
}
