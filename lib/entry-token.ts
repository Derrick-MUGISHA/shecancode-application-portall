import {createCipheriv,createDecipheriv,randomBytes,createHash,timingSafeEqual} from "node:crypto"
import {ENTRY_SOURCES,isEntrySource,type EntrySource} from "./entry-sources"
export const ENTRY_TOKEN_TTL=5*60
export const ENTRY_SESSION_TTL=24*60*60
export const ENTRY_COOKIE="application_entry"
export const ENTRY_HEADERS={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow"}
const aad=Buffer.from("shecancode-application-entry:v1")
const development=globalThis as typeof globalThis & {applicationEntryDevelopmentKey?:Buffer}
function key(){
  const encoded=process.env.APPLICATION_ENTRY_ENCRYPTION_KEY
  if(encoded&&/^[a-f\d]{64}$/i.test(encoded))return Buffer.from(encoded,"hex")
  if(process.env.NODE_ENV!=="development")throw Error("Application entry encryption is not configured.")
  return development.applicationEntryDevelopmentKey ||= randomBytes(32)
}
export function portalOrigin(){
  const url=new URL(process.env.APPLICATION_PORTAL_URL|| (process.env.NODE_ENV==="development"?"http://localhost:3000":"https://apply.shecancodeschool.org"))
  if(process.env.NODE_ENV!=="development"&&url.protocol!=="https:")throw Error("The production application portal must use HTTPS.")
  return url.origin
}
export function entryCookieOptions(){return {httpOnly:true,secure:process.env.NODE_ENV!=="development",sameSite:"lax" as const,path:"/",maxAge:ENTRY_SESSION_TTL}}
export function digestEntrySecret(value:string){return createHash("sha256").update(value).digest("hex")}
export function authenticateEntrySource(source:EntrySource,authorization:string|null){
  const env=ENTRY_SOURCES[source].secretEnv
  if(!env)return false
  const expected=process.env[env],supplied=authorization?.match(/^Bearer ([A-Za-z0-9_-]{32,256})$/)?.[1]
  return !!expected&&expected.length>=32&&!!supplied&&timingSafeEqual(Buffer.from(digestEntrySecret(expected),"hex"),Buffer.from(digestEntrySecret(supplied),"hex"))
}
export function issueEntryToken(source:EntrySource,now=Math.floor(Date.now()/1000)){
  if(source==="development"&&process.env.NODE_ENV!=="development")throw Error("Development entry is disabled.")
  const url=source==="development"?`${portalOrigin()}/entry/development`:ENTRY_SOURCES[source].url
  const payload={v:1,source,url,domain:new URL(url).hostname,iat:now,exp:now+ENTRY_TOKEN_TTL,aud:portalOrigin(),nonce:randomBytes(32).toString("base64url")}
  const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv)
  cipher.setAAD(aad)
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(payload),"utf8"),cipher.final()])
  return ["v1",iv.toString("base64url"),encrypted.toString("base64url"),cipher.getAuthTag().toString("base64url")].join(".")
}
export function verifyEntryToken(token:string,now=Math.floor(Date.now()/1000)){
  if(token.length>4096)throw Error("Invalid entry token.")
  const parts=token.split(".")
  if(parts.length!==4||parts[0]!=="v1"||!parts.slice(1).every(part=>/^[A-Za-z0-9_-]+$/.test(part)))throw Error("Invalid entry token.")
  const iv=Buffer.from(parts[1],"base64url"),tag=Buffer.from(parts[3],"base64url")
  if(iv.length!==12||tag.length!==16)throw Error("Invalid entry token.")
  const decipher=createDecipheriv("aes-256-gcm",key(),iv)
  decipher.setAAD(aad);decipher.setAuthTag(tag)
  const data=JSON.parse(Buffer.concat([decipher.update(Buffer.from(parts[2],"base64url")),decipher.final()]).toString("utf8"))
  if(data.v!==1||!isEntrySource(data.source)||data.aud!==portalOrigin()||typeof data.iat!=="number"||typeof data.exp!=="number"||!Number.isInteger(data.iat)||!Number.isInteger(data.exp)||data.iat>now+30||data.exp<=now||data.exp-data.iat!==ENTRY_TOKEN_TTL||typeof data.nonce!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(data.nonce))throw Error("This entry link has expired or is invalid.")
  if(data.source==="development"&&process.env.NODE_ENV!=="development")throw Error("Development entry is disabled.")
  const source=data.source as EntrySource
  const url=source==="development"?`${portalOrigin()}/entry/development`:ENTRY_SOURCES[source].url
  if(data.url!==url||data.domain!==new URL(url).hostname)throw Error("Invalid entry website.")
  return {v:1 as const,source,url,domain:new URL(url).hostname,iat:data.iat as number,exp:data.exp as number,aud:portalOrigin(),nonce:data.nonce as string}
}
