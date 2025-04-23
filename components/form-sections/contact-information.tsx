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

      <div className="grid grid-cols-1 gap-6">
        <FormField
          control={form.control}
          name="residence"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Residence</FormLabel>
              <FormControl>
                <Input className="bg-white text-gray-700 border border-gray-300" placeholder="Province, District, Sector, Cell, Village" {...field} />
              </FormControl>
              <FormDescription>Format: Province, District, Sector, Cell, Village</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          control={form.control}
          name="emergencyContactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Emergency Contact Name</FormLabel>
              <FormControl>
                <Input className="bg-white text-gray-700 border border-gray-300" placeholder="Contact name" {...field} />
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
                <Input className="bg-white text-gray-700 border border-gray-300" placeholder="e.g., Parent, Spouse, Sibling" {...field} />
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
                <Input className="bg-white text-gray-700 border border-gray-300" placeholder="1234567890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
