"use client"

import { useEffect, useState, useRef } from "react"
import type { Email } from "@prisma/client"
import type { AdminApplication } from "@/lib/admin-application-types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import styles from "./admin.module.css"
import { applicationReturnHref } from "@/lib/admin-navigation"
import { AdminPrivacyContext } from "./privacy-context"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"
import ApplicantInfo from "../ApplicantInfo"
import ApplicationReviewForm from "../ApplicationReviewForm"
import ApplicationSummary from "../ApplicationSummary"
import ApplicationAnswerEditor from "./application-answer-editor"
import { auth } from "@/lib/firebase"

interface ApplicationDetailsProps {
  application: AdminApplication
  emails: Email[]
}

export default function ApplicationDetails({ application: initialApplication, emails }: ApplicationDetailsProps) {
  const [application,setApplication] = useState(initialApplication)
  const [editing,setEditing] = useState(false)
  const [saved,setSaved] = useState(false)
  const refreshing=useRef(false)
  useEffect(()=>setApplication(initialApplication),[initialApplication])
  const [hideDetails, setHideDetails] = useState(false)
  const [tab, setTab] = useState("details")
  const [backHref, setBackHref] = useState("/admin/applications")

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from")
    setBackHref(applicationReturnHref(from))
    setTab(new URLSearchParams(window.location.search).get("tab") === "review" ? "review" : "details")
  }, [])

  useEffect(()=>{
    if(editing||tab!=="details")return
    let active=true
    const refresh=async()=>{
      if(refreshing.current||document.visibilityState!=="visible")return
      refreshing.current=true
      try{
        await auth.authStateReady()
        if(!auth.currentUser)return
        const token=await auth.currentUser.getIdToken()
        const response=await fetch(`/api/applications/${initialApplication.id}/details`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"})
        if(response.ok){const data=await response.json();if(active&&data.application)setApplication(data.application)}
      }catch{/* Keep the current record visible while offline. */}
      finally{refreshing.current=false}
    }
    const timer=setInterval(()=>void refresh(),5000)
    window.addEventListener("focus",refresh)
    return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",refresh)}
  },[editing,tab,initialApplication.id])

  return (
    <AdminPrivacyContext.Provider value={hideDetails}><div className={`${styles.detailScope} space-y-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-slate-500">{hideDetails ? "Personal details are hidden on screen." : "Applicant information"}</span>
        <div className="flex flex-wrap gap-2">{!hideDetails&&<ApplicationAnswerEditor application={application} onEditingChange={setEditing} onSaved={updated=>{setApplication(updated);setSaved(true)}}/>}
        <Button type="button" variant="outline" aria-pressed={hideDetails} onClick={()=>setHideDetails(value=>!value)}>{hideDetails?<Eye size={16} className="mr-2"/>:<EyeOff size={16} className="mr-2"/>}{hideDetails?"Show details":"Hide details"}</Button></div>
        {/* <Link
          href={backHref}
          className="flex items-center text-sm text-muted-foreground hover:text-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Link> */}
      </div>

      {saved&&<p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">Application answers updated successfully.</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs value={tab} onValueChange={value=>{
            setTab(value)
            const url=new URL(window.location.href)
            if(value==="review")url.searchParams.set("tab","review");else url.searchParams.delete("tab")
            window.history.replaceState(null,"",url.pathname+url.search)
          }}>
            <TabsList className="grid w-full grid-cols-2 gap-1 bg-muted">
              <TabsTrigger value="details">Applicant Details</TabsTrigger>
              <TabsTrigger value="review">Review & Decision</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-6 pt-4">
              <ApplicantInfo application={application} />
            </TabsContent>
            <TabsContent value="review" className="space-y-6 pt-4">
              {hideDetails ? <p className="rounded-xl border bg-slate-50 p-6 text-sm">Show details to review or edit this application.</p> : <ApplicationReviewForm application={application} emails={emails} />}
            </TabsContent>
          </Tabs>
        </div>
        <div className={styles.summary}>
          <ApplicationSummary application={application} />
        </div>
      </div>
    </div></AdminPrivacyContext.Provider>
  )
}
