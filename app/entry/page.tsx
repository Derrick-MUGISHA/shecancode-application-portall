import {redirect} from "next/navigation"
import {verifyEntryToken} from "@/lib/entry-token"
import {ENTRY_SOURCES} from "@/lib/entry-sources"
export const dynamic="force-dynamic"
export default async function EntryPage({searchParams}:{searchParams:Promise<{token?:string}>}){
  const {token}=await searchParams
  let entry
  try{if(!token)throw Error();entry=verifyEntryToken(token)}catch{redirect("/entry/required?error=invalid")}
  return <><h1 className="text-3xl font-semibold text-[#193f60]">Your next chapter starts here.</h1><p className="leading-relaxed text-slate-600">Continue from <strong>{ENTRY_SOURCES[entry.source].label}</strong> to start or resume your application.</p><form action="/api/application-entry/redeem" method="post"><input type="hidden" name="token" value={token}/><button type="submit" className="min-h-11 rounded-lg bg-[#193f60] px-6 py-3 font-medium text-white hover:bg-[#245579] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">Continue to application</button></form><p className="text-sm text-slate-500">This entry link can be used once and expires after five minutes. After continuing, you can resume on this browser for up to 24 hours.</p></>
}
