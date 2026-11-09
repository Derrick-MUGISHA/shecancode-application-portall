"use client"

import { forwardRef, useEffect, useState } from "react"
import { CalendarDays } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

function dateParts(value?: Date) {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? { day: String(value.getDate()), month: String(value.getMonth() + 1), year: String(value.getFullYear()) }
    : { day: "", month: "", year: "" }
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

const DateOfBirthInput = forwardRef<HTMLButtonElement, {
  value?: Date
  onChange: (value: Date | undefined) => void
  onBlur: () => void
  id?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}>(({ value, onChange, onBlur, id, ...aria }, ref) => {
  const [parts, setParts] = useState(() => dateParts(value))
  const timestamp = value?.getTime()
  useEffect(() => {
    if (timestamp !== undefined) setParts(dateParts(new Date(timestamp)))
  }, [timestamp])

  function update(part: keyof typeof parts, selected: string) {
    const next = { ...parts, [part]: selected }
    const days = new Date(Number(next.year) || 2000, Number(next.month) || 1, 0).getDate()
    if (Number(next.day) > days) next.day = ""
    setParts(next)
    onChange(next.day && next.month && next.year
      ? new Date(Number(next.year), Number(next.month) - 1, Number(next.day))
      : undefined)
  }

  const days = new Date(Number(parts.year) || 2000, Number(parts.month) || 1, 0).getDate()
  return (
    <div role="group" aria-label="Date of Birth" className="flex items-center gap-2">
      <CalendarDays size={16} aria-hidden="true" className="shrink-0 text-slate-400" />
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_1.5fr_1.2fr] gap-2">
        <Select value={parts.day} onValueChange={selected => update("day", selected)}>
          <SelectTrigger ref={ref} id={id} {...aria} aria-label="Birth day" aria-required="true" onBlur={onBlur}><SelectValue placeholder="Day" /></SelectTrigger>
          <SelectContent>{Array.from({ length: days }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={parts.month} onValueChange={selected => update("month", selected)}>
          <SelectTrigger {...aria} aria-label="Birth month" aria-required="true" onBlur={onBlur}><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>{months.map((month, i) => <SelectItem key={month} value={String(i + 1)}>{month}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={parts.year} onValueChange={selected => update("year", selected)}>
          <SelectTrigger {...aria} aria-label="Birth year" aria-required="true" onBlur={onBlur}><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>{Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => new Date().getFullYear() - i).map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  )
})
DateOfBirthInput.displayName = "DateOfBirthInput"
export default DateOfBirthInput
