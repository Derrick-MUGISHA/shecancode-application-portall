// Copy to the SheCanCode website's app/api/application-entry/route.ts
// (or src/app/api/application-entry/route.ts). Use a normal POST form for its Apply button.
import {NextResponse} from "next/server"
export async function POST(request:Request){
  const headers={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}
  try{
    if(!["https://www.shecancodeschool.org","https://shecancodeschool.org",...(process.env.NODE_ENV==="development"?[new URL(request.url).origin]:[])].includes(request.headers.get("origin")||""))return new Response(null,{status:403})
    const secret=process.env.SHECANCODE_APPLICATION_ENTRY_SECRET
    const portal=new URL(process.env.APPLICATION_PORTAL_URL||(process.env.NODE_ENV==="development"?"http://localhost:3000":"https://apply.shecancodeschool.org"))
    if(!secret||secret.length<32||(process.env.NODE_ENV!=="development"&&portal.protocol!=="https:"))throw Error()
    const response=await fetch(new URL("/api/application-entry/token",portal),{method:"POST",headers:{Authorization:`Bearer ${secret}`,"Content-Type":"application/json"},body:JSON.stringify({source:"shecancode"}),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(10000)})
    if(!response.ok)throw Error()
    const {entryUrl}=await response.json(),target=new URL(entryUrl)
    if(target.origin!==portal.origin||target.pathname!=="/entry")throw Error()
    return NextResponse.redirect(target,{status:303,headers})
  }catch{return new Response("Application entry is temporarily unavailable. Please return to the website and try again.",{status:503,headers})}
}
