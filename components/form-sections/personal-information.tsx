import { format } from "date-fns"
import { CalendarIcon } from 'lucide-react'
import { type UseFormReturn } from "react-hook-form"
import { type z } from "zod"
import { type formSchema } from "@/lib/form-schema"
import { COUNTRIES } from "@/lib/constants"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type FormValues = z.infer<typeof formSchema>

interface PersonalInformationProps {
  form: UseFormReturn<FormValues>
}

export default function PersonalInformation({ form }: PersonalInformationProps) {
  // Watch form values for conditional fields
  const refugeeStatus = form.watch("refugeeStatus")

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
                <Input className="bg-white text-gray-700 border border-gray-300 focus:border-[#ECAB88] focus:ring-1 focus:ring-[#ECAB88] focus:outline-none" placeholder="John Doe" {...field} />
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
                <Input className="bg-white text-gray-700 border border-gray-300" type="email" placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem className="flex flex-col mt-2">
              <FormLabel className="text-gray-700 mb-0.5">Date of Birth</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"date"}
                      className="w-full pl-3 text-left font-normal bg-white text-gray-700 border border-gray-300"
                    >
                      {field.value ? format(field.value, "PPP") : <span className={`${!field.value ? "text-muted-foreground": ""}`}>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50 text-gray-700" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white text-gray-700 border border-gray-300" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
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
                  <SelectItem value="OTHER">Other</SelectItem>
                  <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
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
              <FormLabel  className="text-gray-700">Phone Number</FormLabel>
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
            control={form.control}
            name="refugeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Refugee ID</FormLabel>
                <FormControl>
                  <Input className="bg-white text-gray-700 border border-gray-300" placeholder="Your refugee ID" {...field} />
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
                  <Input className="bg-white text-gray-700 border border-gray-300" placeholder="Your national ID number" {...field} />
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
