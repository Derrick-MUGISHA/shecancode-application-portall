import { z } from "zod"
import { applicationFieldsSchema } from "./form-schema"
import { identificationNumberError, normalizeIdentificationNumber } from "./identity-format"
import { validateRwandaAddress } from "./rwanda-locations"

// Program/cohort assignments, attachments and review decisions have separate workflows.
export const adminAnswerSchema=applicationFieldsSchema.omit({courseId:true,cohortId:true,educationDocument:true}).extend({dateOfBirth:z.coerce.date().refine(date=>date.getTime()<=Date.now(),"Date of birth cannot be in the future."),disabilityType:applicationFieldsSchema.shape.disabilityType.nullable()}).partial().strict()
export function validateAdminAnswerPatch(existing:Record<string,unknown>,input:unknown) {
  const data=adminAnswerSchema.parse(input)
  const merged={...existing,...data}
  if(["identificationNumber","nationality","refugeeStatus"].some(key=>key in data)&&merged.identificationNumber){
    const number=String(merged.identificationNumber),nationality=String(merged.nationality),refugee=Boolean(merged.refugeeStatus)
    const error=identificationNumberError(number,nationality,refugee)
    if(error)throw new z.ZodError([{code:"custom",path:["identificationNumber"],message:error}])
    data.identificationNumber=normalizeIdentificationNumber(number,nationality,refugee)
  }
  if(["province","district","sector","cell","village"].some(key=>key in data)){
    const address={province:String(merged.province),district:String(merged.district),sector:String(merged.sector),cell:String(merged.cell),village:String(merged.village)}
    if(!validateRwandaAddress(address).valid)throw new z.ZodError([{code:"custom",path:["province"],message:"Choose a valid province, district, sector, cell and village hierarchy."}])
  }
  if(data.hasDisability===false){data.disabilityType=null;data.disabilityDetails=""}
  if(data.hasYoungChild===false)data.hasChildcareSupport=false
  return data
}
