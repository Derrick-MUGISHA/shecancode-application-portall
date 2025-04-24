"use client"
import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import type { formSchema } from "@/lib/form-schema"
import { COUNTRIES } from "@/lib/constants"
import { Checkbox } from "@/components/ui/checkbox"
import { useWatch } from "react-hook-form"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type FormValues = z.infer<typeof formSchema>

interface PersonalInformationProps {
  form: UseFormReturn<FormValues>
}

export default function PersonalInformation({ form }: PersonalInformationProps) {
  // Watch form values for conditional fields
  const refugeeStatus = useWatch({
    control: form.control,
    name: "refugeeStatus",
  })

  console.log("Refugee status:", refugeeStatus)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-700">Personal Information</h2>
        <p className="text-sm text-muted-foreground">Please provide your personal details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Full Name</FormLabel>
              <FormControl>
                <Input
                  className="bg-white text-gray-700 border border-gray-300 focus:border-[#ECAB88] focus:ring-1 focus:ring-[#ECAB88] focus:outline-none"
                  placeholder="John Doe"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Email</FormLabel>
              <FormControl>
                <Input
                  className="bg-white text-gray-700 border border-gray-300"
                  type="email"
                  placeholder="john.doe@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => {
            const date = field.value ? new Date(field.value) : null
            const selectedDay = date?.getDate().toString()
            const selectedMonth = (date?.getMonth() ?? 0).toString()
            const selectedYear = date?.getFullYear().toString()

            const handleChange = (type: "day" | "month" | "year", value: string) => {
              const d = date ?? new Date()
              const year = type === "year" ? Number.parseInt(value) : d.getFullYear()
              const month = type === "month" ? Number.parseInt(value) : d.getMonth()
              const day = type === "day" ? Number.parseInt(value) : d.getDate()

              const newDate = new Date(year, month, day)
              field.onChange(newDate)
            }

            return (
              <FormItem>
                <FormLabel className="text-gray-700">Date of Birth</FormLabel>
                <div className="grid grid-cols-3 gap-2">
                  {/* Day */}
                  <Select value={selectedDay} onValueChange={(val) => handleChange("day", val)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[...Array(31)].map((_, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Month */}
                  <Select value={selectedMonth} onValueChange={(val) => handleChange("month", val)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {new Date(0, i).toLocaleString("default", {
                            month: "long",
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Year */}
                  <Select value={selectedYear} onValueChange={(val) => handleChange("year", val)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px] overflow-y-scroll">
                      {Array.from({ length: 100 }, (_, i) => {
                        const year = new Date().getFullYear() - i
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Gender</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  {/* <SelectItem value="OTHER">Other</SelectItem>
                  <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem> */}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Phone Number</FormLabel>
              <FormControl>
                <Input className="bg-white text-gray-700 border border-gray-300" placeholder="1234567890" {...field} />
              </FormControl>
              <FormDescription>Must be exactly 10 digits</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Nationality</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your nationality" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[200px]">
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="refugeeStatus"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-300 p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-gray-700">I am a refugee</FormLabel>
                <FormDescription>Check this box if you have refugee status</FormDescription>
              </div>
            </FormItem>
          )}
        />

        {refugeeStatus ? (
          <FormField
            key="refugeeId"
            control={form.control}
            name="refugeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Refugee ID</FormLabel>
                <FormControl>
                  <Input
                    className="bg-white text-gray-700 border border-gray-300"
                    placeholder="Your refugee ID"
                    disabled={false}
                    onChange={(e) => {
                      console.log("Input value:", e.target.value)
                      field.onChange(e)
                    }}
                    value={field.value || ""}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="nationalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">National ID Number</FormLabel>
                <FormControl>
                  <Input
                    className="bg-white text-gray-700 border border-gray-300"
                    placeholder="Your national ID number"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  )
}
