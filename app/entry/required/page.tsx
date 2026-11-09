import Link from "next/link"
import {isLocalDevelopmentPortal} from "@/lib/entry-token"
import {ENTRY_SOURCES} from "@/lib/entry-sources"
export default async function EntryRequired({searchParams}:{searchParams:Promise<{error?:string}>}){
  const {error}=await searchParams
  return <><h1 className="text-3xl font-semibold text-[#193f60]">Start with a program</h1><p className="leading-relaxed text-slate-600">{error?"This entry link has expired, has already been used, or is invalid. Please return to a program website for a new link.":"To apply, visit one of our websites and choose its Apply button. We’ll bring you back here with a secure entry link."}</p><ul className="space-y-3">{Object.entries(ENTRY_SOURCES).filter(([id])=>id!=="development").map(([id,source])=><li key={id}><a href={source.url} className="block rounded-lg border border-slate-200 p-4 text-sm font-medium text-[#193f60] hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">{source.label} ↗</a></li>)}</ul>{isLocalDevelopmentPortal()&&<Link href="/entry/development" className="inline-block text-sm font-medium text-blue-800 underline">Open local application</Link>}</>
}
