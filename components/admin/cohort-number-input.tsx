"use client"
import { forwardRef, type ComponentProps } from "react"
import { Input } from "@/components/ui/input"
import { cohortNumberFromInput } from "@/lib/cohort-input"

type Props=Omit<ComponentProps<"input">,"value"|"onChange"|"type"> & {value:string;onValueChange:(value:string)=>void}
const CohortNumberInput=forwardRef<HTMLInputElement,Props>(({value,onValueChange,...props},ref)=><Input {...props} ref={ref} type="text" inputMode="numeric" autoComplete="off" spellCheck={false} value={`cohort-${value}`} onChange={event=>{const number=cohortNumberFromInput(event.target.value);if(number!==undefined)onValueChange(number)}}/>)
CohortNumberInput.displayName="CohortNumberInput"
export default CohortNumberInput
