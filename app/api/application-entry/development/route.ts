import {NextResponse} from "next/server"
import {issueEntryToken,portalOrigin,ENTRY_HEADERS,isLocalDevelopmentRequest} from "@/lib/entry-token"
export async function POST(request:Request){
  if(!isLocalDevelopmentRequest(request.url))return new Response(null,{status:404})
  if(request.headers.get("origin")!==portalOrigin())return new Response(null,{status:403})
  return NextResponse.redirect(new URL(`/entry?token=${encodeURIComponent(issueEntryToken("development"))}`,portalOrigin()),{status:303,headers:ENTRY_HEADERS})
}
