import {NextResponse} from "next/server"
import {isEntrySource} from "@/lib/entry-sources"
import {authenticateEntrySource,issueEntryToken,portalOrigin,ENTRY_HEADERS,ENTRY_TOKEN_TTL} from "@/lib/entry-token"
export const dynamic="force-dynamic"
export async function POST(request:Request){
  try{
    const body=await request.json()
    if(!isEntrySource(body.source)||!authenticateEntrySource(body.source,request.headers.get("authorization")))return NextResponse.json({message:"Website authentication required."},{status:401,headers:ENTRY_HEADERS})
    const token=issueEntryToken(body.source)
    return NextResponse.json({entryUrl:`${portalOrigin()}/entry?token=${encodeURIComponent(token)}`,expiresIn:ENTRY_TOKEN_TTL},{headers:ENTRY_HEADERS})
  }catch{return NextResponse.json({message:"Unable to create an entry link."},{status:400,headers:ENTRY_HEADERS})}
}
