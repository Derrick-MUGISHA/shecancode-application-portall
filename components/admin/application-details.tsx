"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ADMIN_APPLICATIONS_KEY } from "@/hooks/use-admin-applications"

import { useCallback, useEffect, useState, useRef } from "react"
import type { Email } from "@prisma/client"
import type { AdminApplication } from "@/lib/admin-application-types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import styles from "./admin.module.css"
import { applicationReturnHref } from "@/lib/admin-navigation"
import { AdminPrivacyContext } from "./privacy-context"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, ArrowLeft, RefreshCw, Pencil, MoreHorizontal } from "lucide-react"
import ApplicantInfo from "../ApplicantInfo"
import ApplicationReviewForm from "../ApplicationReviewForm"
import ApplicationSummary from "../ApplicationSummary"
import ApplicationAnswerEditor from "./application-answer-editor"
import { auth } from "@/lib/firebase"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"

interface ApplicationDetailsProps {
  application: AdminApplication
  emails: Email[]
}

export default function ApplicationDetails({ application: initialApplication, emails }: ApplicationDetailsProps) {
  const queryClient=useQueryClient()
  const [application,setApplication] = useState(initialApplication)
  const [editing,setEditing] = useState(false)
  const [saved,setSaved] = useState(false)
  const refreshRequest=useRef<AbortController|null>(null)
  const [refreshing,setRefreshing] = useState(false)
  const [refreshError,setRefreshError]=useState("")
  const lastRefresh=useRef(Date.now())
  useEffect(()=>{setApplication(initialApplication);lastRefresh.current=Date.now()},[initialApplication])
  const [hideDetails, setHideDetails] = useState(false)
  const [tab, setTab] = useState("details")
  const [backHref, setBackHref] = useState("/admin/applications")

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from")
    setBackHref(applicationReturnHref(from))
    setTab(new URLSearchParams(window.location.search).get("tab") === "review" ? "review" : "details")
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [initialApplication.id])

  const refresh=useCallback(async(manual=false)=>{
      if(editing||tab!=="details"||refreshRequest.current||(!manual&&(document.visibilityState!=="visible"||Date.now()-lastRefresh.current<30000)))return
      const controller=new AbortController()
      refreshRequest.current=controller
      setRefreshing(true)
      setRefreshError("")
      try{
        await auth.authStateReady()
        controller.signal.throwIfAborted()
        if(!auth.currentUser)throw Error("Sign in as an administrator to refresh this application.")
        const token=await auth.currentUser.getIdToken()
        const response=await fetch(`/api/applications/${initialApplication.id}/details`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:controller.signal})
        if(!response.ok)throw Error("Unable to refresh this application. Please try again.")
        const data=await response.json()
        if(!controller.signal.aborted&&data.application)setApplication(data.application)
      }catch(error){if(!controller.signal.aborted)setRefreshError(error instanceof Error?error.message:"Unable to refresh this application. Please try again.")}
      finally{
        if(refreshRequest.current===controller){lastRefresh.current=Date.now();refreshRequest.current=null;setRefreshing(false)}
      }
  },[editing,tab,initialApplication.id])

  useEffect(()=>{
    const onReturn=()=>void refresh()
    window.addEventListener("focus",onReturn)
    document.addEventListener("visibilitychange",onReturn)
    return()=>{
      window.removeEventListener("focus",onReturn);document.removeEventListener("visibilitychange",onReturn)
      refreshRequest.current?.abort();refreshRequest.current=null;setRefreshing(false)
    }
  },[refresh])

  return (
    <AdminPrivacyContext.Provider value={hideDetails}>
      <div className={`${styles.detailScope} space-y-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-slate-500">{hideDetails ? "Personal details are hidden on screen." : "Applicant information"}</span>
        <Button type="button" variant="ghost" asChild><Link href={backHref} prefetch={false}><ArrowLeft size={16} aria-hidden="true"/>Back to applications</Link></Button>
      </div>

      {refreshError&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{refreshError}</p>}
      {saved&&<p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">Application answers updated successfully.</p>}
      <Tabs value={tab} onValueChange={value=>{
        setTab(value)
        const url=new URL(window.location.href)
        if(value==="review")url.searchParams.set("tab","review");else url.searchParams.delete("tab")
        window.history.replaceState(null,"",url.pathname+url.search)
      }}>
        <div className={styles.detailTabsRow}>
          <TabsList className="grid w-full grid-cols-2 gap-1">
            <TabsTrigger value="details">Applicant Details</TabsTrigger>
            <TabsTrigger value="review">Review & Decision</TabsTrigger>
          </TabsList>
        </div>
        <div className={styles.detailLayout}>
          <div className="min-w-0">
            <TabsContent value="details" className="m-0 space-y-6">
              <ApplicantInfo application={application} />
            </TabsContent>
            <TabsContent value="review" className="m-0 space-y-6">
              {hideDetails ? <p className="rounded-xl border bg-white p-6 text-sm">Show details to review or edit this application.</p> : <ApplicationReviewForm application={application} emails={emails} />}
            </TabsContent>
          </div>
          <aside className={styles.summary} aria-label="Application summary">
            <ApplicationSummary application={application} actions={
              <ApplicationAnswerEditor application={application} onEditingChange={setEditing}
                onSaved={updated=>{void queryClient.invalidateQueries({queryKey:ADMIN_APPLICATIONS_KEY});setApplication(updated);lastRefresh.current=Date.now();setSaved(true)}}
                renderTrigger={openEditor=>(
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm" aria-label="Application actions"><MoreHorizontal size={16} className="mr-1.5" aria-hidden="true"/>Actions</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={8} className={styles.applicationMenu}>
                      <DropdownMenuItem disabled={refreshing||editing||tab!=="details"} onSelect={()=>void refresh(true)}>
                        <RefreshCw size={15} aria-hidden="true" className={refreshing ? "animate-spin" : ""}/>{refreshing ? "Refreshing…" : "Refresh"}
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={hideDetails||editing} onSelect={()=>requestAnimationFrame(openEditor)}>
                        <Pencil size={15} aria-hidden="true"/>Edit application
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={()=>setHideDetails(value=>!value)}>
                        {hideDetails ? <Eye size={15} aria-hidden="true"/> : <EyeOff size={15} aria-hidden="true"/>}{hideDetails ? "Show details" : "Hide details"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )} />
            } />
          </aside>
        </div>
      </Tabs>
    </div></AdminPrivacyContext.Provider>
  )
}
