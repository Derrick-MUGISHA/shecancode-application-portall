import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import type { formSchema } from "@/lib/form-schema"

import { Checkbox } from "@/components/ui/checkbox"
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"

type FormValues = z.infer<typeof formSchema>

interface FamilyEquipmentProps {
  form: UseFormReturn<FormValues>
}

export default function FamilyEquipment({ form }: FamilyEquipmentProps) {
  // Watch form values for conditional fields
  const hasYoungChild = form.watch("hasYoungChild")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-700">Family and Equipment</h2>
        <p className="text-sm text-muted-foreground">Information about childcare and equipment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="hasYoungChild"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-300 p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-gray-700">I have a young child</FormLabel>
                <FormDescription>Check this box if you have a young child</FormDescription>
              </div>
            </FormItem>
          )}
        />

        {hasYoungChild && (
          <FormField
            control={form.control}
            name="hasChildcareSupport"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-300 p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-gray-700">I have childcare support</FormLabel>
                  <FormDescription>Check this box if you have childcare support</FormDescription>
                </div>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="hasLaptop"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-300 p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-gray-700">I have a laptop</FormLabel>
                <FormDescription>Check this box if you have a laptop for the course</FormDescription>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
