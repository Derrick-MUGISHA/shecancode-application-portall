"use client"

import { useEffect, useState } from "react"
import SearchableSelect, { type SearchOption } from "@/components/searchable-select"
import PhoneInput from "@/components/phone-input"
import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import type { formSchema } from "@/lib/form-schema"

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

type FormValues = z.infer<typeof formSchema>

interface ContactInformationProps {
  form: UseFormReturn<FormValues>
}

export default function ContactInformation({ form }: ContactInformationProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-700">Contact Information</h2>
        <p className="text-sm text-muted-foreground">Please provide your residence and emergency contact details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(["province", "district", "sector", "cell", "village"] as const).map((name, index, levels) => (
          <RwandaLocationField key={name} form={form} name={name} index={index} levels={levels} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          control={form.control}
          name="emergencyContactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Emergency Contact Name</FormLabel>
              <FormControl>
                <Input className="bg-white text-gray-700 border border-gray-300" required placeholder="Contact name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="emergencyContactRelation"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Relationship</FormLabel>
              <FormControl>
                <Input className="bg-white text-gray-700 border border-gray-300" required placeholder="e.g., Parent, Spouse, Sibling" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="emergencyContactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Emergency Contact Phone</FormLabel>
              <FormControl>
                <PhoneInput required className="bg-white text-gray-700 border border-gray-300" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

type AddressField = "province" | "district" | "sector" | "cell" | "village"
function RwandaLocationField({ form, name, index, levels }: ContactInformationProps & {
  name: AddressField; index: number; levels: readonly AddressField[]
}) {
  const [options, setOptions] = useState<SearchOption[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const parents = form.watch(["province", "district", "sector", "cell"])
  const parentKey = parents.slice(0, index).join("|")
  const ready = index === 0 || parents.slice(0, index).every(Boolean)
  const label = name[0].toUpperCase() + name.slice(1)

  useEffect(() => {
    setOptions([])
    setFailed(false)
    if (!ready) { setLoading(false); return }
    const controller = new AbortController()
    const query = new URLSearchParams({ level: name })
    for (let i = 0; i < index; i++) query.set(levels[i], parentKey.split("|")[i])
    setLoading(true)
    fetch("/api/locations?" + query, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Failed to load locations"); return response.json() })
      .then(setOptions)
      .catch(() => { if (!controller.signal.aborted) setFailed(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [name, index, parentKey, ready, retry])

  return <FormField control={form.control} name={name} render={({ field }) => (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <SearchableSelect {...field} aria-required="true" label={label} options={options} loading={loading}
          disabled={!ready || failed} placeholder={ready ? `Select ${name}` : `Select ${levels[index - 1]} first`}
          onChange={value => {
            field.onChange(value)
            for (const child of levels.slice(index + 1)) {
              form.setValue(child, "", { shouldDirty: true })
              form.clearErrors(child)
            }
          }} />
      </FormControl>
      {failed && <p role="alert" className="text-sm text-red-700">Unable to load {name} options. <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Try again</button></p>}
      {!loading && ready && !failed && !options.length && <FormDescription>No locations found. Please check the selection above.</FormDescription>}
      <FormMessage />
    </FormItem>
  )} />
}
