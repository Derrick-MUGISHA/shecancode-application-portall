// Copy to the Igire website's src/app/api/application-entry/route.ts.
// Only this server route receives the shared secret; never import it into a client component.
import {NextResponse} from "next/server"
const sources:Record<string,string>={"inclusive-futures":"igire-codebridge","advanced-java-backend-development":"igire-backend","advanced-frontend-development":"igire-frontend","web-fundamentals":"igire-fundamentals"}
export const dynamic="force-dynamic"
async function enterProgram(program:unknown){
  const headers={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}
  try{
    if(typeof program!=="string"||!Object.hasOwn(sources,program))return NextResponse.json({message:"Unknown program."},{status:400,headers})
    const secret=process.env.IGIRE_APPLICATION_ENTRY_SECRET
    const portal=new URL(process.env.APPLICATION_PORTAL_URL || (process.env.NODE_ENV==="development"?"http://localhost:3000":"https://apply.shecancodeschool.org"))
    if(!secret||secret.length<32||(process.env.NODE_ENV!=="development"&&portal.protocol!=="https:"))throw Error()
    const result=await fetch(new URL("/api/application-entry/token",portal),{method:"POST",headers:{Authorization:`Bearer ${secret}`,"Content-Type":"application/json"},body:JSON.stringify({source:sources[program]}),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(10000)})
    if(!result.ok)throw Error()
    const {entryUrl}=await result.json(),target=new URL(entryUrl)
    if(target.origin!==portal.origin||target.pathname!=="/entry")throw Error()
    return NextResponse.redirect(target, {status:303,headers})
  }catch{
    return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Application link unavailable</title><main style="font:16px system-ui;max-width:36rem;margin:15vh auto;padding:24px"><h1>We couldn’t open the application portal.</h1><p>Please return to the program page and try again shortly.</p><a href="/programs">Back to programs</a></main></html>',{status:503,headers:{...headers,"Content-Type":"text/html; charset=utf-8"}})
  }
}

// No entry is redeemed here. Each plain-link visit only mints a fresh encrypted link.
// The portal automatically redeems the token through its single-use POST endpoint.
export async function GET(request:Request){return enterProgram(new URL(request.url).searchParams.get('program'))}
export async function POST(request:Request){
  const allowed=['https://www.igirerwanda.org','https://igirerwanda.org']
  if(process.env.NODE_ENV==='development'&&['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname))allowed.push(new URL(request.url).origin)
  if(!allowed.includes(request.headers.get('origin')||''))return NextResponse.json({message:'Please start from the Igire program page.'},{status:403})
  return enterProgram((await request.formData()).get('program'))
}
