"use client"
import { UserRound } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import type { formSchema } from "@/lib/form-schema"
import { applicationFieldsSchema } from "@/lib/form-schema"
import { isRwandaNationalId, formatIdentificationNumber, identificationNumberError, normalizeEmailAddress } from "@/lib/identity-format"
import DateOfBirthInput from "@/components/date-of-birth-input"
import PhoneInput from "@/components/phone-input"
import SearchableSelect from "@/components/searchable-select"
import { COUNTRIES } from "@/lib/constants"
import { Checkbox } from "@/components/ui/checkbox"
import { useWatch } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type FormValues = z.infer<typeof formSchema>

interface PersonalInformationProps {
  form: UseFormReturn<FormValues>
}

export default function PersonalInformation({ form }: PersonalInformationProps) {
  // Watch gender to display warning for male participants
  const selectedGender = useWatch({
    control: form.control,
    name: "gender",
  })

  // Watch refugee status (optional)
  const refugeeStatus = useWatch({
    control: form.control,
    name: "refugeeStatus",
  })

  const nationality = form.watch("nationality") || ""
  const rwandaId = isRwandaNationalId(nationality, !!refugeeStatus)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-700">Personal Information</h2>
        <p className="text-sm text-muted-foreground">Please provide your personal details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Full Name</FormLabel>
              <FormControl>
                <Input
                  className="bg-white text-gray-700 border border-gray-300"
                  placeholder="John Doe" autoComplete="name" required
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Email</FormLabel>
              <FormControl>
                <Input
                  className="bg-white text-gray-700 border border-gray-300"
                  type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false}
                  placeholder="john.doe@example.com"
                  {...field}
                  onBlur={() => {
                    field.onBlur()
                    const value = normalizeEmailAddress(field.value || "")
                    field.onChange(value)
                    const result = applicationFieldsSchema.shape.email.safeParse(value)
                    if (!result.success) form.setError("email", { type: "validate", message: result.error.issues[0].message })
                    else form.clearErrors("email")
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
          <FormItem>
            <FormLabel>Date of Birth</FormLabel>
            <FormControl><DateOfBirthInput ref={field.ref} value={field.value} onChange={field.onChange} onBlur={field.onBlur} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Gender */}
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Gender</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger icon={UserRound} aria-required="true">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />

              {/* Male warning */}
              {selectedGender === "MALE" && (
                <p className="mt-2 text-sm text-red-600 font-medium">
                  ⚠️ Note: Our program primarily sponsors women 100%. Male participants only pay 50% participation fee.
                </p>
              )}
            </FormItem>
          )}
        />

        {/* Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Phone Number</FormLabel>
              <FormControl>
                <PhoneInput required className="bg-white text-gray-700 border border-gray-300" {...field} />
              </FormControl>
              <FormDescription>Use +country code for numbers outside Rwanda.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Nationality */}
        <FormField
          control={form.control}
          name="nationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Nationality</FormLabel>
              <FormControl>
                <SearchableSelect {...field} aria-required="true" label="Nationality" options={COUNTRIES.map(country => ({ value: country, label: country }))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Refugee Status */}
        <FormField
          control={form.control}
          name="refugeeStatus"
          render={({ field }) => (
            <FormItem>
              <span className="block text-sm font-medium text-gray-700">Refugee Status</span>
              <div className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="font-normal text-gray-700">I am a refugee</FormLabel>
              </div>
              <FormDescription>Select if you have refugee status.</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="identificationNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">{refugeeStatus ? "Refugee Registration Number" : rwandaId ? "National ID Number" : "ID Number"}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} required autoComplete="off"
                  inputMode={rwandaId ? "numeric" : "text"} maxLength={rwandaId ? 19 : 80}
                  onBlur={() => {
                    field.onBlur()
                    const value = formatIdentificationNumber(field.value || "", nationality, !!refugeeStatus)
                    field.onChange(value)
                    const message = identificationNumberError(value, nationality, !!refugeeStatus)
                    if (message) form.setError("identificationNumber", { type: "validate", message })
                    else form.clearErrors("identificationNumber")
                  }}
                  placeholder={refugeeStatus ? "Enter your refugee registration number" : "Enter your ID number"}
                  className="bg-white text-gray-700 border border-gray-300" />
              </FormControl>
              <FormDescription>{rwandaId ? "16 digits. Spaces are added for readability; leading zeros are preserved." : "Enter the number exactly as it appears on your document."}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
