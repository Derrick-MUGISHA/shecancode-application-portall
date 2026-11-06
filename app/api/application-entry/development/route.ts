import {NextResponse} from "next/server"
import {issueEntryToken,portalOrigin,ENTRY_HEADERS} from "@/lib/entry-token"
export async function POST(request:Request){
  if(process.env.NODE_ENV!=="development"||!["localhost","127.0.0.1","[::1]"].includes(new URL(request.url).hostname))return new Response(null,{status:404})
  if(request.headers.get("origin")!==portalOrigin())return new Response(null,{status:403})
  return NextResponse.redirect(new URL(`/entry?token=${encodeURIComponent(issueEntryToken("development"))}`,portalOrigin()),303)
}
