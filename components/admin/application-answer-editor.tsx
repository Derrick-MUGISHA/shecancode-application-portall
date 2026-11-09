"use client"
import { useState } from "react"
import type { AdminApplication } from "@/lib/admin-application-types"
import { formatIdentificationNumber, isRwandaNationalId } from "@/lib/identity-format"
import { applicationFieldsSchema } from "@/lib/form-schema"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import IdentificationNumberInput from "@/components/identification-number-input"
import PhoneInput from "@/components/phone-input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Loader2 } from "lucide-react"
const groups=[
  {title:"Personal information",fields:["fullName","email","dateOfBirth","gender","phone","nationality","refugeeStatus","identificationNumber"]},
  {title:"Disability and support",fields:["hasDisability","disabilityType","disabilityDetails","hasYoungChild","hasChildcareSupport","hasLaptop"]},
  {title:"Location and emergency contact",fields:["province","district","sector","cell","village","emergencyContactName","emergencyContactRelation","emergencyContactPhone"]},
  {title:"Education and occupation",fields:["currentOccupation","occupationDetails","educationBackground","university","academicBackground","englishProficiency","englishSkillConfidence"]},
  {title:"Motivation and profiles",fields:["motivation","howDidYouKnow","howDidYouKnowSpecification","linkedInProfile","githubProfile","additionalFeedback"]},
]
const labels:Record<string,string>={identificationNumber:"ID / refugee registration number",educationBackground:"Highest completed education",occupationDetails:"Current work, studies or activities",hasYoungChild:"Has a young child",hasChildcareSupport:"Has childcare support",hasLaptop:"Has a laptop",howDidYouKnow:"How they heard about us",howDidYouKnowSpecification:"Referral details"}
const human=(value:string)=>value.replace(/([a-z])([A-Z])/g,"$1 $2").replaceAll("_"," ").toLowerCase().replace(/^./,c=>c.toUpperCase())
const long=new Set(["disabilityDetails","occupationDetails","academicBackground","motivation","additionalFeedback"])
const booleans=new Set(["refugeeStatus","hasDisability","hasYoungChild","hasChildcareSupport","hasLaptop"])
function initialValues(application:AdminApplication){return Object.fromEntries(groups.flatMap(group=>group.fields).map(key=>[key,key==="dateOfBirth"?new Date(application.dateOfBirth).toISOString().slice(0,10):key==="identificationNumber"?formatIdentificationNumber(application.identificationNumber||"",application.nationality,application.refugeeStatus):(application as unknown as Record<string,unknown>)[key]??(booleans.has(key)?false:"")]))}
export default function ApplicationAnswerEditor({application,onSaved,onEditingChange}:{application:AdminApplication;onSaved:(application:AdminApplication)=>void;onEditingChange:(value:boolean)=>void}) {
  const [open,setOpen]=useState(false),[saving,setSaving]=useState(false),[values,setValues]=useState<Record<string,unknown>>({}),[baseline,setBaseline]=useState<Record<string,unknown>>({}),[version,setVersion]=useState(""),[error,setError]=useState(""),[errors,setErrors]=useState<Record<string,string[]>>({})
  function changeOpen(next:boolean){if(saving)return;setOpen(next);onEditingChange(next);if(next){const data=initialValues(application);setValues(data);setBaseline(data);setVersion(new Date(application.updatedAt).toISOString());setError("");setErrors({})}}
  const changes=Object.fromEntries(Object.entries(values).filter(([key,value])=>value!==baseline[key]).map(([key,value])=>[key,key==="dateOfBirth"?`${value}T00:00:00.000Z`:key==="disabilityType"&&value===""?null:value]))
  async function save(event:React.FormEvent){
    event.preventDefault();setSaving(true);setError("");setErrors({})
    try{
      await auth.authStateReady();if(!auth.currentUser)throw Error("Sign in as an administrator to save edits.")
      const token=await auth.currentUser.getIdToken()
      const response=await fetch(`/api/applications/${application.id}/details`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({changes,updatedAt:version}),cache:"no-store"})
      const result=await response.json()
      if(!response.ok){setErrors(result.errors||{});const first=Object.keys(result.errors||{})[0];if(first)requestAnimationFrame(()=>document.getElementById(`edit-${first}`)?.focus());throw Error(result.message||"Unable to save edits.")}
      onSaved(result.application);setOpen(false);onEditingChange(false)
    }catch(error){setError(error instanceof Error?error.message:"Unable to save edits.")}
    finally{setSaving(false)}
  }
  return <><Button type="button" variant="outline" onClick={()=>changeOpen(true)}><Pencil size={16} className="mr-2" aria-hidden="true"/>Edit application</Button><Dialog open={open} onOpenChange={changeOpen}><DialogContent className="flex max-h-[92svh] w-[calc(100vw-24px)] max-w-3xl flex-col overflow-hidden rounded-2xl bg-white"><DialogHeader><DialogTitle>Edit application answers</DialogTitle><DialogDescription>Update applicant information. Program, cohort and the saved attachment stay assigned to this application. No email is sent.</DialogDescription></DialogHeader><form onSubmit={save} className="flex min-h-0 flex-1 flex-col gap-4"><div className="min-h-0 space-y-7 overflow-y-auto px-1 pb-2">{groups.map(group=><fieldset key={group.title} className="space-y-4"><legend className="mb-3 text-lg font-semibold text-[#193f60]">{group.title}</legend><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{group.fields.map(key=>{
    const shape=applicationFieldsSchema.shape[key as keyof typeof applicationFieldsSchema.shape]
    const inner="unwrap" in shape?shape.unwrap():shape
    const candidates="options" in inner?inner.options:undefined
    const options=Array.isArray(candidates)&&candidates.every(value=>typeof value==="string")?candidates as string[]:undefined
    const rwandaId=key==="identificationNumber"&&isRwandaNationalId(String(values.nationality||""),Boolean(values.refugeeStatus))
    const label=labels[key]||human(key),id=`edit-${key}`,invalid=!!errors[key]
    const update=(value:unknown)=>setValues(current=>({...current,[key]:value}))
    return <div key={key} className={long.has(key)?"space-y-2 sm:col-span-2":"space-y-2"}><label id={`${id}-label`} htmlFor={booleans.has(key)?undefined:id} className="text-sm font-medium text-slate-700">{label}</label>{booleans.has(key)?<div role="group" aria-labelledby={`${id}-label`} className="flex gap-2">{[true,false].map(value=><Button type="button" key={String(value)} variant={values[key]===value?"default":"outline"} aria-pressed={values[key]===value} onClick={()=>update(value)}>{value?"Yes":"No"}</Button>)}</div>:options?<Select value={String(values[key]||"")} onValueChange={update}><SelectTrigger id={id} aria-invalid={invalid} aria-describedby={invalid?`${id}-error`:undefined} className="min-h-11 bg-white text-sm"><SelectValue placeholder="Data not available"/></SelectTrigger><SelectContent className="z-[90] max-h-64 bg-white">{options.map(option=><SelectItem key={option} value={option} className="min-h-11 text-sm">{human(option)}</SelectItem>)}</SelectContent></Select>:long.has(key)?<Textarea id={id} value={String(values[key]||"")} onChange={event=>update(event.target.value)} aria-invalid={invalid} aria-describedby={invalid?`${id}-error`:undefined} className="min-h-24 bg-white text-base"/>:key.toLowerCase().includes("phone")?<PhoneInput id={id} name={key} value={String(values[key]??"")} onChange={update} aria-invalid={invalid} aria-describedby={invalid?`${id}-error`:undefined}/>:key==="identificationNumber"?<IdentificationNumberInput id={id} name={key} nationality={String(values.nationality||"")} refugeeStatus={Boolean(values.refugeeStatus)} value={String(values[key]||"")} onChange={update} placeholder={rwandaId?"1 1990 8 1234567 0 12":"Enter registration number"} aria-invalid={invalid} aria-describedby={invalid?`${id}-error`:undefined}/>:<Input id={id} name={key} type={key==="email"?"email":key.toLowerCase().includes("phone")?"tel":key==="dateOfBirth"?"date":key.endsWith("Profile")?"url":"text"} value={String(values[key]??"")} onChange={event=>update(event.target.value)} onBlur={key==="identificationNumber"?()=>update(formatIdentificationNumber(String(values[key]||""),String(values.nationality||""),Boolean(values.refugeeStatus))):undefined} inputMode={rwandaId?"numeric":undefined} maxLength={key==="identificationNumber"?(rwandaId?21:80):undefined} placeholder={rwandaId?"1 1990 8 1234567 0 12":undefined} aria-invalid={invalid} aria-describedby={invalid?`${id}-error`:undefined}/>}{invalid&&<p id={`${id}-error`} className="text-sm text-red-700">{errors[key].join(" ")}</p>}</div>
  })}</div></fieldset>)}</div>{error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<div className="flex shrink-0 justify-end gap-3 border-t pt-4"><Button type="button" variant="outline" disabled={saving} onClick={()=>changeOpen(false)}>Cancel</Button><Button type="submit" disabled={saving||!Object.keys(changes).length}>{saving&&<Loader2 size={16} className="mr-2 animate-spin"/>}{saving?"Saving…":"Save changes"}</Button></div></form></DialogContent></Dialog></>
}
