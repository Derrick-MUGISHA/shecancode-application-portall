import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { canDownloadEducationDocument } from "@/lib/verify-document-admin"
import { validateAdminAnswerPatch } from "@/lib/admin-application-edit"
import { revalidatePath } from "next/cache"
export const dynamic="force-dynamic"
const headers={"Cache-Control":"private, no-store"}
type Context={params:Promise<{id:string}>}
export async function GET(request:Request,{params}:Context) {
  if(!await canDownloadEducationDocument(request))return NextResponse.json({message:"Administrator sign-in required"},{status:401,headers})
  const {id}=await params
  if(!/^[a-f\d]{24}$/i.test(id))return NextResponse.json({message:"Invalid application ID"},{status:400,headers})
  try {
    const application=await prisma.application.findUnique({where:{id},include:{course:true,cohort:true}})
    return NextResponse.json(application?{application}:{message:"Application not found"},{status:application?200:404,headers})
  }catch{return NextResponse.json({message:"Unable to refresh this application."},{status:500,headers})}
}
export async function PATCH(request:Request,{params}:Context) {
  if(!await canDownloadEducationDocument(request))return NextResponse.json({message:"Administrator sign-in required"},{status:401,headers})
  const {id}=await params
  if(!/^[a-f\d]{24}$/i.test(id))return NextResponse.json({message:"Invalid application ID"},{status:400,headers})
  try {
    const payload=z.object({changes:z.record(z.string(),z.unknown()),updatedAt:z.iso.datetime()}).strict().parse(await request.json())
    const existing=await prisma.application.findUnique({where:{id}})
    if(!existing)return NextResponse.json({message:"Application not found"},{status:404,headers})
    const changes=validateAdminAnswerPatch(existing,payload.changes)
    if(!Object.keys(changes).length)return NextResponse.json({message:"No changes to save."},{status:400,headers})
    const result=await prisma.application.updateMany({where:{id,updatedAt:new Date(payload.updatedAt)},data:changes})
    if(!result.count)return NextResponse.json({message:"This application changed while you were editing. Close the editor, refresh, and try again."},{status:409,headers})
    const application=await prisma.application.findUnique({where:{id},include:{course:true,cohort:true}})
    revalidatePath("/admin/applications")
    revalidatePath(`/admin/applications/${id}`)
    return NextResponse.json({application},{headers})
  }catch(error){
    if(error instanceof z.ZodError)return NextResponse.json({message:error.issues[0].message,errors:error.flatten().fieldErrors},{status:400,headers})
    if(error&&typeof error==="object"&&"code" in error&&error.code==="P2002")return NextResponse.json({message:"An application already uses this email address.",errors:{email:["This email address is already in use."]}},{status:409,headers})
    return NextResponse.json({message:"Unable to save the application. Your edits are still here."},{status:500,headers})
  }
}
