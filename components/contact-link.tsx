import { Mail, Phone } from "lucide-react"
import { formatPhoneNumber } from "@/lib/phone"
export default function ContactLink({value,kind}:{value:string;kind:"email"|"phone"}) {
  if(!value)return <span>Data not available</span>
  const email=kind==="email"
  const Icon=email?Mail:Phone
  return <a href={email?`mailto:${value}`:`tel:${value.replace(/[^+\d]/g,"")}`} title={email?`Email ${value}`:`Call ${formatPhoneNumber(value)}`} className="inline-flex max-w-full items-center gap-2 rounded-md px-1 py-1 font-medium text-[#1e527e] underline decoration-[#a9c6dd] underline-offset-4 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"><Icon size={15} className="shrink-0" aria-hidden="true"/><span className="break-all">{email?value:formatPhoneNumber(value)}</span></a>
}
