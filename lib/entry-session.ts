import {randomBytes} from "node:crypto"
import prisma from "./prisma"
import {verifyEntryToken,digestEntrySecret,ENTRY_SESSION_TTL,ENTRY_COOKIE} from "./entry-token"
export async function redeemEntryToken(token:string){
  const entry=verifyEntryToken(token)
  const session=randomBytes(32).toString("base64url")
  // Unique nonce hash is the shared, atomic replay check across all deployment instances.
  await prisma.applicationEntry.create({data:{nonceHash:digestEntrySecret(entry.nonce),sessionHash:digestEntrySecret(session),source:entry.source,sourceUrl:entry.url,sourceDomain:entry.domain,issuedAt:new Date(entry.iat*1000),submittedAt:null,expiresAt:new Date(Date.now()+ENTRY_SESSION_TTL*1000)}})
  return session
}
export async function entrySessionFromCookie(value:string|undefined){
  if(!value||!/^[A-Za-z0-9_-]{43}$/.test(value))return null
  const entry=await prisma.applicationEntry.findUnique({where:{sessionHash:digestEntrySecret(value)}})
  return entry&&!entry.submittedAt&&entry.expiresAt.getTime()>Date.now()?entry:null
}
export function entryCookieFromRequest(request:Request){return request.headers.get("cookie")?.split(";").map(value=>value.trim()).find(value=>value.startsWith(ENTRY_COOKIE+"="))?.slice(ENTRY_COOKIE.length+1)}
export function readEntrySession(request:Request){return entrySessionFromCookie(entryCookieFromRequest(request))}
