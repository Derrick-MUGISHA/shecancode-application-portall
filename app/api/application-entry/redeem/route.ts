import {NextResponse} from "next/server"
import {redeemEntryToken} from "@/lib/entry-session"
import {ENTRY_COOKIE,entryCookieOptions,portalOrigin,ENTRY_HEADERS} from "@/lib/entry-token"
export const dynamic="force-dynamic"
export async function POST(request:Request){
  try{
    const origin=request.headers.get("origin")
    if(origin&&origin!==portalOrigin())throw Error("Invalid request origin")
    const form=await request.formData(),token=form.get("token")
    if(typeof token!=="string")throw Error("Entry token required")
    const session=await redeemEntryToken(token)
    const response=NextResponse.redirect(new URL("/apply?step=1",portalOrigin()),303)
    Object.entries(ENTRY_HEADERS).forEach(([name,value])=>response.headers.set(name,value))
    response.cookies.set(ENTRY_COOKIE,session,entryCookieOptions())
    return response
  }catch{
    const response=NextResponse.redirect(new URL("/entry/required?error=invalid",portalOrigin()),303)
    Object.entries(ENTRY_HEADERS).forEach(([name,value])=>response.headers.set(name,value))
    return response
  }
}
