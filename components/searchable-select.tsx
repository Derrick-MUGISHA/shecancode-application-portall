"use client"
import { forwardRef, useState } from "react"
import type { ButtonHTMLAttributes } from "react"
import { Check, ChevronDown, MapPin, Globe2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"

import { ApplicationFieldSkeleton } from "./application-skeletons"

export type SearchOption = { value: string; label: string; keywords?: string[] }
type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value" | "onChange"> & {
  value?: string; onChange: (value: string) => void; options: SearchOption[]
  label: string; placeholder?: string; loading?: boolean
}
const SearchableSelect = forwardRef<HTMLButtonElement, Props>(({ value, onChange, options, label, placeholder, loading, disabled, className, ...props }, ref) => {
  const [open, setOpen] = useState(false)
  const Icon = label === "Nationality" ? Globe2 : MapPin
  if (loading) return <div id={props.id}><ApplicationFieldSkeleton label={label} /></div>
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button {...props} ref={ref} type="button" role="combobox" aria-expanded={open} aria-haspopup="dialog"
          disabled={disabled || loading} className={`flex h-11 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition-[border-color,box-shadow] duration-150 hover:enabled:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-200/70 ${className || ""}`}>
          <Icon size={16} strokeWidth={1.6} className="shrink-0 text-slate-400" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{options.find(option => option.value === value)?.label || value || placeholder || `Select ${label.toLowerCase()}`}</span>
          <ChevronDown size={16} className="shrink-0 opacity-60" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={`Choose ${label.toLowerCase()}`} className="w-[var(--radix-popover-trigger-width)] border-slate-300 p-0 bg-white text-slate-900 shadow-lg">
        <Command loop className="bg-white text-slate-900">
          <CommandInput placeholder={`Search ${label.toLowerCase()}…`} aria-label={`Search ${label.toLowerCase()}`} className="bg-slate-50 text-slate-900 px-2" />
          <CommandList>
            <CommandEmpty>No matching options.</CommandEmpty>
            <CommandGroup>{options.map(option => (
              <CommandItem key={option.value} value={option.label} keywords={option.keywords} aria-label={option.label + (value === option.value ? ", selected" : "")}
                className={value === option.value ? "bg-blue-50 font-medium text-blue-950" : ""}
                onSelect={() => { onChange(option.value); setOpen(false) }}>
                <Check size={15} className={`mr-2 ${value === option.value ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
                {option.label}
              </CommandItem>
            ))}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})
SearchableSelect.displayName = "SearchableSelect"
export default SearchableSelect
