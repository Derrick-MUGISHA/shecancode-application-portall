"use client"
import { forwardRef, useState } from "react"
import { CalendarDays, Clock3 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const pad=(value:number)=>String(value).padStart(2,"0")
const dayString=(date:Date)=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
type Props={value:string;onChange:(value:string)=>void;onBlur?:()=>void;label?:string;withTime?:boolean;id?:string;"aria-describedby"?:string;"aria-invalid"?:boolean;"aria-required"?:boolean}
const AdminDatePicker=forwardRef<HTMLButtonElement,Props>(({value,onChange,onBlur,label="Choose date",withTime=false,...aria},ref)=>{
  const [open,setOpen]=useState(false)
  const [day,time="17:00"]=value.split("T")
  const [hour="17",minute="00"]=time.split(":")
  const candidate=day?new Date(Number(day.slice(0,4)),Number(day.slice(5,7))-1,Number(day.slice(8,10))):undefined
  const selected=candidate&&!Number.isNaN(candidate.getTime())?candidate:undefined
  const shown=selected?new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(selected):label
  return <div className="space-y-3">
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button ref={ref} type="button" variant="outline" {...aria} onBlur={onBlur} aria-label={label} className="h-auto min-h-11 w-full justify-between bg-white px-3 text-left text-sm font-normal text-slate-700"><span>{shown}</span><CalendarDays size={16} className="ml-2 shrink-0 text-slate-500" aria-hidden="true"/></Button></PopoverTrigger>
      <PopoverContent align="start" side="bottom" collisionPadding={12} className="z-[80] w-[304px] max-w-[calc(100vw-24px)] rounded-xl border-slate-200 bg-white p-2 text-slate-700 shadow-xl" aria-label="Select date">
        <Calendar mode="single" selected={selected} defaultMonth={selected} onSelect={date=>{if(!date)return;onChange(dayString(date)+(withTime?`T${time}`:""));setOpen(false)}} initialFocus classNames={{day_selected:"bg-[#193f60] text-white hover:bg-[#285777] hover:text-white focus:bg-[#193f60] focus:text-white",day_today:"bg-blue-50 font-semibold text-blue-800"}}/>
        <div className="flex justify-between border-t border-slate-200 px-3 pt-2"><Button type="button" variant="ghost" size="sm" onClick={()=>{onChange("");setOpen(false)}}>Clear</Button><Button type="button" variant="ghost" size="sm" onClick={()=>setOpen(false)}>Close</Button></div>
      </PopoverContent>
    </Popover>
    {withTime&&<div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Clock3 size={15} aria-hidden="true"/>Time · Kigali (UTC+2)</p><div className="flex items-center gap-3">
      <Select disabled={!day} value={hour} onValueChange={next=>onChange(`${day}T${next}:${minute}`)}><SelectTrigger aria-label="Closing hour" className="w-24 bg-white text-sm"><SelectValue/></SelectTrigger><SelectContent position="popper" className="z-[90] max-h-60">{Array.from({length:24},(_,i)=><SelectItem key={i} value={pad(i)} className="text-sm">{pad(i)}</SelectItem>)}</SelectContent></Select>
      <span aria-hidden="true">:</span><Select disabled={!day} value={minute} onValueChange={next=>onChange(`${day}T${hour}:${next}`)}><SelectTrigger aria-label="Closing minute" className="w-24 bg-white text-sm"><SelectValue/></SelectTrigger><SelectContent position="popper" className="z-[90] max-h-60">{Array.from({length:60},(_,i)=><SelectItem key={i} value={pad(i)} className="text-sm">{pad(i)}</SelectItem>)}</SelectContent></Select><span className="text-sm text-slate-500">24-hour</span>
    </div>{!day&&<p className="mt-2 text-sm text-slate-500">Choose a date to set the time.</p>}</div>}
  </div>
})
AdminDatePicker.displayName="AdminDatePicker"
export default AdminDatePicker
