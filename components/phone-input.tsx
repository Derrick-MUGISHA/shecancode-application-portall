"use client"
import { forwardRef } from "react"
import type { ComponentProps } from "react"
import { Input } from "@/components/ui/input"
import { formatPhoneNumber } from "@/lib/phone"

type Props = Omit<ComponentProps<typeof Input>, "onChange"> & { onChange: (value: string) => void }
const PhoneInput = forwardRef<HTMLInputElement, Props>(({ onChange, onBlur, value, ...props }, ref) => (
  <Input {...props} ref={ref} type="tel" inputMode="tel" autoComplete="tel" maxLength={25}
    value={value || ""} placeholder="+250 788 123 456"
    onChange={event => onChange(event.target.value)}
    onBlur={event => { onChange(formatPhoneNumber(String(value || ""))); onBlur?.(event) }} />
))
PhoneInput.displayName = "PhoneInput"
export default PhoneInput
