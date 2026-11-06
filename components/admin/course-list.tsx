"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useRef } from "react"
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Loader2, Layers3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { acceptingApplications, kigaliDateTimeInput } from "@/lib/program-availability"
import { availableProgram, visibleAdminCohorts, cohortSettingsFor, courseDetailsSchema } from "@/lib/cohorts"
import type { Program, CohortOption } from "@/lib/program-types"
import { paginateAdminRows } from "@/lib/admin-applications"
import { toast } from "@/components/ui/use-toast"
import CohortNumberInput from "./cohort-number-input"
import AdminSelect from "./admin-select"
import AdminDatePicker from "./admin-date-picker"
import styles from "./admin.module.css"

export type AdminProgram=Program & {createdAt?:string}
type Errors=Record<string,string>
const fieldErrors=(issues:{path:PropertyKey[];message:string}[])=>Object.fromEntries(issues.map(issue=>[String(issue.path[0]),issue.message]))

export default function CourseList({initialPrograms}:{initialPrograms?:AdminProgram[]}={}) {
  const [programs,setPrograms]=useState<AdminProgram[]>(initialPrograms||[])
  const [loading,setLoading]=useState(!initialPrograms)
  const [loadError,setLoadError]=useState("")
  const [query,setQuery]=useState("")
  const [focusOpen,setFocusOpen]=useState(false)
  const [availability,setAvailability]=useState("ALL")
  const [sort,setSort]=useState("name")
  const [page,setPage]=useState(1)
  const [expanded,setExpanded]=useState<string|null>(initialPrograms?.[0]?.id||null)
  const [programDialog,setProgramDialog]=useState(false)
  const [editingProgram,setEditingProgram]=useState<AdminProgram|null>(null)
  const [programForm,setProgramForm]=useState({name:"",description:"",isOpen:true})
  const [cohortProgram,setCohortProgram]=useState<AdminProgram|null>(null)
  const [editingCohort,setEditingCohort]=useState<CohortOption|null>(null)
  const [cohortForm,setCohortForm]=useState({number:"1",capacity:"",closesAt:"",isOpen:true})
  const [errors,setErrors]=useState<Errors>({})
  const [saveError,setSaveError]=useState("")
  const [saving,setSaving]=useState(false)
  const [deleting,setDeleting]=useState<{program:AdminProgram;cohort?:CohortOption}|null>(null)
  const lastLoad=useRef(Date.now())
  const inFlight=useRef(false)
  const load=async(quiet=false)=>{
    if(inFlight.current)return
    inFlight.current=true;lastLoad.current=Date.now()
    if(!quiet)setLoading(true)
    try {const response=await fetch("/api/courses",{cache:"no-store"});if(!response.ok)throw Error("Unable to load programs.");const data=await response.json();setPrograms(data);setExpanded(current=>current||data[0]?.id||null);setLoadError("")}
    catch(error){setLoadError(error instanceof Error?error.message:"Unable to load programs.")}
    finally{inFlight.current=false;setLoading(false)}
  }
  useEffect(()=>{void load(Boolean(initialPrograms))},[initialPrograms])
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==="visible"&&!saving&&Date.now()-lastLoad.current>=5000)void load(true)}
    const timer=setInterval(refresh,5000);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh)
    return()=>{clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh)}
  },[saving])
  const filtered=useMemo(()=>programs.filter(program=>`${program.name} ${(program.cohorts||[]).map(cohort=>cohort.cohortLabel).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()) && (!focusOpen || visibleAdminCohorts(program,true).length>0) && (availability==="ALL" || (availability==="OPEN"?availableProgram(program):!availableProgram(program)))).sort((a,b)=>sort==="newest"?new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime():sort==="cohorts"?(b.cohorts?.length||0)-(a.cohorts?.length||0):a.name.localeCompare(b.name)),[programs,query,availability,sort,focusOpen])
  const pagination=paginateAdminRows(filtered,page,10)
  const openProgram=(program?:AdminProgram)=>{setEditingProgram(program||null);setProgramForm({name:program?.name||"",description:program?.description||"",isOpen:program?.isOpen!==false});setErrors({});setSaveError("");setProgramDialog(true)}
  const openCohort=(program:AdminProgram,cohort?:CohortOption)=>{setCohortProgram(program);setEditingCohort(cohort||null);setCohortForm({number:String(cohort?.number||Math.max(0,...(program.cohorts||[]).map(item=>item.number))+1),capacity:cohort?.capacity==null?"":String(cohort.capacity),closesAt:kigaliDateTimeInput(cohort?.closesAt),isOpen:cohort?cohort.isOpen:true});setErrors({});setSaveError("")}
  const fail=(map:Errors)=>{setErrors(map);const first=Object.keys(map)[0];requestAnimationFrame(()=>document.getElementById(`admin-${first}`)?.focus())}
  const save=async(event:React.FormEvent,kind:"program"|"cohort")=>{
    event.preventDefault();setSaveError("");setErrors({})
    let payload:unknown
    if(kind==="program"){
      const result=courseDetailsSchema.safeParse(programForm)
      if(!result.success){fail(fieldErrors(result.error.issues));return}payload=result.data
    }else{
      const date=cohortForm.closesAt?new Date(cohortForm.closesAt+"+02:00"):null
      if(date&&Number.isNaN(date.getTime())){fail({closesAt:"Choose a valid closing date and time."});return}
      const result=cohortSettingsFor(editingCohort||undefined).safeParse({number:Number(cohortForm.number),capacity:cohortForm.capacity?Number(cohortForm.capacity):null,closesAt:date?.toISOString()??null,isOpen:cohortForm.isOpen})
      if(!result.success){fail(fieldErrors(result.error.issues));return}
      if(result.data.capacity!=null&&result.data.capacity<(editingCohort?.applicationCount||0)){fail({capacity:"Spaces cannot be fewer than applications already received by this cohort."});return}
      payload=result.data
    }
    setSaving(true)
    try {
      const url=kind==="program"?`/api/courses${editingProgram?`/${editingProgram.id}`:""}`:`/api/courses/${cohortProgram!.id}/cohorts${editingCohort?`/${editingCohort.id}`:""}`
      const response=await fetch(url,{method:(kind==="program"?editingProgram:editingCohort)?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
      if(!response.ok){const data=await response.json();if(data.errors)fail(Object.fromEntries(Object.entries(data.errors).map(([key,value])=>[key,(value as string[])[0]])));setSaveError(data.message||"Unable to save. Please try again.");return}
      toast({title:kind==="program"?"Program saved":"Cohort saved",description:kind==="cohort"?"This cohort belongs to its program and has its own capacity and deadline.":"Program details updated."})
      setProgramDialog(false);if(cohortProgram)setExpanded(cohortProgram.id);setCohortProgram(null);await load(true)
    }catch{setSaveError("Unable to save. Check your connection and try again.")}
    finally{setSaving(false)}
  }
  const remove=async()=>{
    if(!deleting)return;setSaving(true);setSaveError("")
    try{const response=await fetch(`/api/courses/${deleting.program.id}${deleting.cohort?`/cohorts/${deleting.cohort.id}`:""}`,{method:"DELETE"});if(!response.ok){setSaveError((await response.json()).message||"Unable to delete.");return}setDeleting(null);await load(true)}
    catch{setSaveError("Unable to delete. Please try again.")}finally{setSaving(false)}
  }
  const message=(field:string)=>errors[field]?<p id={`admin-${field}-error`} role="alert" className="text-sm text-red-700">{errors[field]}</p>:null
  return <div className={styles.workspace}>
    <header className={styles.heading}><div><h1>Programs & cohorts</h1><p>Create a program once, then add cohort-1, cohort-2, and more inside it.</p></div><Button onClick={()=>openProgram()}><Plus size={16} className="mr-2"/>Add program</Button></header>
    <div className={styles.toolbar}><div className={styles.filters}>
      <label className={styles.filter}>Search programs or cohorts<Input type="search" value={query} placeholder="Program or cohort" onChange={event=>{setQuery(event.target.value);setPage(1)}}/></label>
      <AdminSelect label="Availability" value={availability} onChange={value=>{setAvailability(value);setPage(1)}} options={[{value:"ALL",label:"All programs"},{value:"OPEN",label:"Accepting applications"},{value:"CLOSED",label:"Closed or full"}]}/>
      <AdminSelect label="Sort programs" value={sort} onChange={value=>{setSort(value);setPage(1)}} options={[{value:"name",label:"Program A–Z"},{value:"newest",label:"Newest first"},{value:"cohorts",label:"Most cohorts"}]}/>
    </div><label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"><Checkbox checked={focusOpen} onCheckedChange={value=>{setFocusOpen(value===true);setPage(1)}}/><span><strong className="font-medium">Focus mode: open cohorts only</strong><span className="mt-1 block text-slate-500">Show active cohorts with spaces remaining. Keep edit and delete actions available.</span></span></label></div>
    {loadError&&<p role="alert">{loadError} <Button variant="outline" onClick={()=>load()}>Retry</Button></p>}
    {loading?<p role="status" className={styles.empty}>Loading programs…</p>:!filtered.length?<p className={styles.empty}>No programs match these filters.</p>:<div className={styles.programList}>{pagination.rows.map(program=><article key={program.id} className={styles.program}>
      <div className={styles.programTop}><div><h2>{program.name}</h2>{program.description&&<p>{program.description}</p>}<p>{program.cohorts?.length||0} {(program.cohorts?.length||0)===1?"cohort":"cohorts"} · {(program.cohorts||[]).filter(cohort=>acceptingApplications(cohort)).length} open · {program.applicationCount||0} applications{program.isOpen===false?" · Program hidden":""}</p></div><div className={styles.programActions}>
        <Button variant="outline" onClick={()=>setExpanded(expanded===program.id?null:program.id)} aria-expanded={expanded===program.id||focusOpen} disabled={focusOpen} aria-controls={`cohorts-${program.id}`}><Layers3 size={16} className="mr-2"/>Cohorts<ChevronDown size={15} className="ml-2"/></Button>
        <Button onClick={()=>openCohort(program)} aria-label={`Add cohort to ${program.name}`}><Plus size={16} className="mr-2"/>Add cohort</Button>
        <Button variant="outline" onClick={()=>openProgram(program)} aria-label={`Edit program ${program.name}`}><Pencil size={16} className="mr-2"/>Edit program</Button>
        <Button variant="outline" disabled={!!program.applicationCount||!!program.cohorts?.length} title="Only programs without applications or cohorts can be deleted" onClick={()=>{setDeleting({program});setSaveError("")}} aria-label={`Delete program ${program.name}`}><Trash2 size={16} className="mr-2"/>Delete program</Button>
      </div></div>
      {(expanded===program.id||focusOpen)&&<section id={`cohorts-${program.id}`} className={styles.cohortArea} aria-label={`${program.name} cohorts`}>
        {!program.cohorts?.length?<p className="text-sm leading-7 text-slate-600">No cohorts yet. Add the first cohort inside this program. Existing applications stay with the program and show “Data not available” for their cohort.</p>:<div className={styles.tableScroll}><Table><TableHeader><TableRow><TableHead>Cohort</TableHead><TableHead>Applications / spaces</TableHead><TableHead>Closes · Kigali</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{visibleAdminCohorts(program,focusOpen).map(cohort=><TableRow key={cohort.id}><TableCell className="font-semibold">{cohort.cohortLabel}</TableCell><TableCell>{cohort.applicationCount} / {cohort.capacity??"Not set"}<p className="mt-1 text-sm text-slate-500">{cohort.spacesLeft==null?"Data not available":`${cohort.spacesLeft} spaces left`}</p></TableCell><TableCell>{cohort.closesAt?kigaliDateTimeInput(cohort.closesAt).replace("T"," · "):"Data not available"}</TableCell><TableCell><span className={`${styles.status} ${acceptingApplications(cohort)&&program.isOpen!==false?"bg-emerald-50 text-emerald-800":"bg-slate-100 text-slate-600"}`}>{acceptingApplications(cohort)&&program.isOpen!==false?"Open":cohort.spacesLeft===0?"Full":"Closed"}</span></TableCell><TableCell><div className="flex gap-2"><Button variant="outline" size="sm" asChild><Link href={`/admin/applications?course=${program.id}&cohort=${cohort.cohortLabel}`}>Applications</Link></Button><Button variant="outline" size="sm" onClick={()=>openCohort(program,cohort)} aria-label={`Edit ${cohort.cohortLabel} in ${program.name}`}><Pencil size={15} className="mr-2"/>Edit</Button><Button variant="outline" size="sm" disabled={cohort.applicationCount>0} onClick={()=>{setDeleting({program,cohort});setSaveError("")}} aria-label={`Delete ${cohort.cohortLabel} in ${program.name}`}><Trash2 size={15} className="mr-2"/>Delete</Button></div></TableCell></TableRow>)}</TableBody></Table></div>}
      </section>}
    </article>)}</div>}
    <nav className={styles.pagination} aria-label="Programs pagination"><span>{pagination.start}–{pagination.end} of {filtered.length} programs</span><div><span>Page {pagination.page} of {pagination.pages}</span><Button variant="outline" aria-label="Previous programs page" disabled={pagination.page===1} onClick={()=>setPage(pagination.page-1)}><ChevronRight size={16} className="rotate-180"/></Button><Button variant="outline" aria-label="Next programs page" disabled={pagination.page===pagination.pages} onClick={()=>setPage(pagination.page+1)}><ChevronRight size={16}/></Button></div></nav>
    <Dialog open={programDialog} onOpenChange={open=>{if(!saving)setProgramDialog(open)}}><DialogContent className="max-h-[90svh] overflow-y-auto rounded-2xl bg-white sm:max-w-xl"><DialogHeader><DialogTitle>{editingProgram?"Edit program":"Add program"}</DialogTitle><DialogDescription>Program details are shared by all its cohorts. Add cohorts separately inside the program.</DialogDescription></DialogHeader><form noValidate onSubmit={event=>save(event,"program")} className="space-y-5">
      <div className="space-y-2"><label htmlFor="admin-name" className="text-sm font-medium">Program name</label><Input id="admin-name" value={programForm.name} onChange={event=>setProgramForm({...programForm,name:event.target.value})} aria-invalid={!!errors.name} aria-describedby={errors.name?"admin-name-error":undefined} placeholder="e.g. Web Fundamentals"/>{message("name")}</div>
      <div className="space-y-2"><label htmlFor="admin-description" className="text-sm font-medium">Description</label><Textarea id="admin-description" value={programForm.description} onChange={event=>setProgramForm({...programForm,description:event.target.value})} className="min-h-28 text-sm"/>{message("description")}</div>
      <label className="flex items-start gap-3 rounded-xl border p-4 text-sm"><Checkbox checked={programForm.isOpen} onCheckedChange={value=>setProgramForm({...programForm,isOpen:value===true})}/><span>Show this program<p className="mt-1 text-sm text-slate-500">Hide a program to pause applications across all its cohorts.</p></span></label>
      {saveError&&<p role="alert" className="text-sm text-red-700">{saveError}</p>}<DialogFooter className="border-t pt-4"><Button type="button" variant="outline" disabled={saving} onClick={()=>setProgramDialog(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving?<Loader2 className="mr-2 animate-spin" size={16}/>:null}Save program</Button></DialogFooter>
    </form></DialogContent></Dialog>
    <Dialog open={!!cohortProgram} onOpenChange={open=>{if(!open&&!saving)setCohortProgram(null)}}><DialogContent className="max-h-[90svh] overflow-y-auto rounded-2xl bg-white sm:max-w-xl"><DialogHeader><DialogTitle>{editingCohort?`Edit ${editingCohort.cohortLabel}`:"Add cohort"}</DialogTitle><DialogDescription>{cohortProgram?.name} · Each cohort has its own application spaces and closing date.</DialogDescription></DialogHeader><form noValidate onSubmit={event=>save(event,"cohort")} className="space-y-5">
      <div className="space-y-2"><label htmlFor="admin-number" className="text-sm font-medium">Cohort number</label><CohortNumberInput id="admin-number" disabled={!!editingCohort?.applicationCount} value={cohortForm.number} onValueChange={number=>setCohortForm({...cohortForm,number})} aria-invalid={!!errors.number} aria-describedby={errors.number?"admin-number-error":undefined}/><p className="text-sm text-slate-500">Numbered within this program: cohort-1, cohort-2, and so on.</p>{message("number")}</div>
      <div className="space-y-2"><label htmlFor="admin-capacity" className="text-sm font-medium">Total application spaces</label><Input id="admin-capacity" type="number" min={Math.max(1,editingCohort?.applicationCount||0)} max={100000} step={1} value={cohortForm.capacity} onChange={event=>setCohortForm({...cohortForm,capacity:event.target.value})} aria-invalid={!!errors.capacity} aria-describedby={errors.capacity?"admin-capacity-error":undefined}/><p className="text-sm text-slate-500">Each submitted application uses one space in this cohort.</p>{message("capacity")}</div>
      <div className="space-y-2"><label htmlFor="admin-closesAt" className="text-sm font-medium">Closing date and time</label><AdminDatePicker id="admin-closesAt" label="Choose closing date and time" withTime value={cohortForm.closesAt} onChange={value=>setCohortForm({...cohortForm,closesAt:value})} aria-invalid={!!errors.closesAt} aria-describedby={errors.closesAt?"admin-closesAt-error":undefined}/><p className="text-sm text-slate-500">Kigali time (UTC+2). New open cohorts need a future deadline.</p>{message("closesAt")}</div>
      <label className="flex items-start gap-3 rounded-xl border p-4 text-sm"><Checkbox checked={cohortForm.isOpen} onCheckedChange={value=>setCohortForm({...cohortForm,isOpen:value===true})}/><span>Open this cohort for applications<p className="mt-1 text-sm text-slate-500">Applicants choose this cohort inside its program.</p></span></label>
      {saveError&&<p role="alert" className="text-sm text-red-700">{saveError}</p>}<DialogFooter className="border-t pt-4"><Button type="button" variant="outline" disabled={saving} onClick={()=>setCohortProgram(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving?<Loader2 className="mr-2 animate-spin" size={16}/>:null}Save cohort</Button></DialogFooter>
    </form></DialogContent></Dialog>
    <Dialog open={!!deleting} onOpenChange={open=>{if(!open&&!saving)setDeleting(null)}}><DialogContent><DialogHeader><DialogTitle>Delete {deleting?.cohort?"cohort":"program"}?</DialogTitle><DialogDescription>Only empty records can be deleted. Close a cohort with applications instead.</DialogDescription></DialogHeader>{saveError&&<p role="alert" className="text-sm text-red-700">{saveError}</p>}<DialogFooter><Button variant="outline" disabled={saving} onClick={()=>setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={saving} onClick={remove}>Delete</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
