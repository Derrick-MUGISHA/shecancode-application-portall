"use client"
import { useId } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import styles from "./admin.module.css"

export default function AdminSelect({label,value,onChange,options,placeholder="Choose an option",disabled=false}:{label:string;value:string;onChange:(value:string)=>void;options:{value:string;label:string}[];placeholder?:string;disabled?:boolean}) {
  const id=useId()
  return <div className={styles.filter}><label htmlFor={id}>{label}</label><Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger id={id} className="min-h-11 text-sm"><SelectValue placeholder={placeholder}/></SelectTrigger><SelectContent className="max-h-80 text-sm">{options.map(option=><SelectItem key={option.value} value={option.value} className="min-h-11 text-sm">{option.label}</SelectItem>)}</SelectContent></Select></div>
}
