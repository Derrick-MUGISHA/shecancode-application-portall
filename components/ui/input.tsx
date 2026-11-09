import * as React from "react"
import { UserRound, Mail, Phone, IdCard, Building2, HeartHandshake, Linkedin, Github, Link2, FileUp, Search, BriefcaseBusiness, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<"input"> & { icon?: LucideIcon }
const fieldIcons: Partial<Record<string, LucideIcon>> = {
  fullName: UserRound, email: Mail, phone: Phone, identificationNumber: IdCard,
  emergencyContactName: UserRound, emergencyContactRelation: HeartHandshake,
  emergencyContactPhone: Phone, university: Building2, linkedInProfile: Linkedin,
  githubProfile: Github, occupationDetails: BriefcaseBusiness,
}
const typeIcons: Partial<Record<string, LucideIcon>> = { email: Mail, tel: Phone, url: Link2, file: FileUp, search: Search }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    const Icon = icon || fieldIcons[props.name || ""] || typeIcons[type || ""]
    const input = (
      <input type={type} ref={ref} {...props}
        className={cn(
          "flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-700 shadow-none transition-[border-color,box-shadow] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-600 placeholder:text-slate-400 hover:enabled:border-slate-300 focus-visible:outline-none focus-visible:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-200/70 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className, Icon && "pl-10"
        )} />
    )
    if (!Icon) return input
    return <span className="relative block w-full min-w-0">
      <Icon size={16} strokeWidth={1.6} aria-hidden="true" className="pointer-events-none absolute left-3 top-[22px] -translate-y-1/2 text-slate-400" />
      {input}
    </span>
  }
)
Input.displayName = "Input"
export { Input }
