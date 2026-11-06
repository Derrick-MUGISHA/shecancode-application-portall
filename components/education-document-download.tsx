"use client"
import { useEffect, useRef, useState } from "react"
import { FileText, Eye, Download, Loader2 } from "lucide-react"
import { auth } from "@/lib/firebase"
import { documentPreviewKind } from "@/lib/admin-navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function EducationDocumentDownload({applicationId,name}:{applicationId:string;name:string}) {
  const [open,setOpen]=useState(false)
  const [phase,setPhase]=useState<"preview"|"download"|null>(null)
  const [error,setError]=useState("")
  const [resource,setResource]=useState<{url:string;type:string;size:number}|null>(null)
  const blob=useRef<Blob|null>(null)
  const request=useRef<Promise<Blob>|null>(null)
  const controller=useRef<AbortController|null>(null)
  const urls=useRef(new Set<string>())
  const previewURL=useRef<string|null>(null)
  const previewRequested=useRef(false)
  const mounted=useRef(true)
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();urls.current.forEach(url=>URL.revokeObjectURL(url));urls.current.clear();blob.current=null}},[applicationId])
  const release=(url:string)=>{URL.revokeObjectURL(url);urls.current.delete(url)}
  const makeURL=(file:Blob)=>{const url=URL.createObjectURL(file);urls.current.add(url);return url}
  async function getDocument():Promise<Blob> {
    if(blob.current)return blob.current
    if(request.current)return request.current
    request.current=(async()=>{
      await auth.authStateReady()
      if(!auth.currentUser)throw Error("Sign in as an administrator to view this attachment.")
      const token=await auth.currentUser.getIdToken()
      controller.current=new AbortController()
      const response=await fetch(`/api/applications/${applicationId}/education-document`,{headers:{Authorization:`Bearer ${token}`},signal:controller.current.signal,cache:"no-store"})
      if(!response.ok)throw Error(response.status===404?"This attachment is not available.":"Unable to open this attachment. Sign in again and retry.")
      const file=await response.blob()
      blob.current=file
      return file
    })()
    try{return await request.current}finally{request.current=null}
  }
  async function preview() {
    previewRequested.current=true;setOpen(true);setError("");setPhase("preview")
    try{const file=await getDocument();if(!mounted.current||!previewRequested.current)return;if(previewURL.current)release(previewURL.current);previewURL.current=makeURL(file);setResource({url:previewURL.current,type:file.type,size:file.size})}
    catch(error){if(mounted.current&&previewRequested.current)setError(error instanceof Error?error.message:"Unable to preview the document.")}
    finally{if(mounted.current)setPhase(null)}
  }
  async function download() {
    setError("");setPhase("download")
    try{const file=await getDocument();if(!mounted.current)return;const url=makeURL(file);const link=document.createElement("a");link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>release(url),1000)}
    catch(error){if(mounted.current)setError(error instanceof Error?error.message:"Unable to download the document.")}
    finally{if(mounted.current)setPhase(null)}
  }
  function changeOpen(next:boolean) {setOpen(next);if(!next){previewRequested.current=false;if(previewURL.current)release(previewURL.current);previewURL.current=null;setResource(null)}}
  const kind=resource?documentPreviewKind(resource.type):undefined
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><FileText size={22} className="shrink-0 text-slate-500" aria-hidden="true"/><span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-700">{name}</span><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={preview} disabled={!!phase}><Eye size={16} className="mr-2" aria-hidden="true"/>Preview</Button><Button type="button" variant="outline" onClick={download} disabled={!!phase}><Download size={16} className="mr-2" aria-hidden="true"/>{phase==="download"?"Downloading…":"Download"}</Button></div></div>
    {error&&!open&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <Dialog open={open} onOpenChange={changeOpen}><DialogContent className="flex max-h-[94svh] w-[calc(100vw-24px)] max-w-5xl flex-col overflow-hidden rounded-2xl bg-white p-4 sm:p-6"><DialogHeader className="pr-6"><DialogTitle>Document preview</DialogTitle><DialogDescription className="break-words">{name}{resource?` · ${Math.ceil(resource.size/1024)} KB`:""}</DialogDescription></DialogHeader>
      <div className="flex min-h-[240px] flex-1 items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-50" style={{height:"min(65svh,700px)"}}>
        {phase==="preview"?<p role="status" className="flex items-center gap-2 p-6 text-sm text-slate-600"><Loader2 size={18} className="animate-spin" aria-hidden="true"/>Loading document…</p>:error?<p role="alert" className="p-6 text-sm text-red-700">{error}</p>:resource&&kind==="image"?<img src={resource.url} alt={`Education attachment: ${name}`} className="h-full max-h-[65svh] w-full object-contain"/>:resource&&kind==="pdf"?<iframe src={resource.url} title={`PDF preview: ${name}`} className="h-[65svh] w-full border-0"/>:<p className="p-6 text-center text-sm text-slate-600">An inline preview is not available for this format. You can download the document below.</p>}
      </div>
      {kind==="pdf"&&<p className="text-sm text-slate-500">If your browser cannot display the PDF, use Download to open it on your device.</p>}
      <DialogFooter className="border-t pt-4"><Button type="button" variant="outline" onClick={()=>changeOpen(false)}>Close preview</Button><Button type="button" onClick={download} disabled={!!phase}><Download size={16} className="mr-2" aria-hidden="true"/>{phase==="download"?"Downloading…":"Download document"}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>
}
