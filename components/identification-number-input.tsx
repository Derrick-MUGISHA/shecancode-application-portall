"use client"
import { forwardRef, useLayoutEffect, useRef, type ComponentProps } from "react"
import { Input } from "@/components/ui/input"
import { identificationInputEdit, isRwandaNationalId } from "@/lib/identity-format"
type Props=Omit<ComponentProps<typeof Input>,"onChange">&{nationality:string;refugeeStatus:boolean;onChange:(value:string)=>void}
const IdentificationNumberInput=forwardRef<HTMLInputElement,Props>(({nationality,refugeeStatus,onChange,value,...props},ref)=>{
  const input=useRef<HTMLInputElement|null>(null)
  const pendingCaret=useRef<number|null>(null)
  useLayoutEffect(()=>{
    if(pendingCaret.current!==null&&input.current&&input.current===document.activeElement){input.current.setSelectionRange(pendingCaret.current,pendingCaret.current);pendingCaret.current=null}
  })
  return <Input {...props} ref={element=>{input.current=element;if(typeof ref==="function")ref(element);else if(ref)ref.current=element}} value={value||""} type="text" inputMode={isRwandaNationalId(nationality,refugeeStatus)?"numeric":"text"} maxLength={isRwandaNationalId(nationality,refugeeStatus)?21:80} autoComplete="off" onChange={event=>{
    const result=identificationInputEdit(event.target.value,String(value||""),event.target.selectionStart??event.target.value.length,nationality,refugeeStatus,(event.nativeEvent as InputEvent).inputType)
    pendingCaret.current=result.caret
    onChange(result.value)
  }}/>
})
IdentificationNumberInput.displayName="IdentificationNumberInput"
export default IdentificationNumberInput
