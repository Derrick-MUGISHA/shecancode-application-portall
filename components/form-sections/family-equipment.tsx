"use client";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import type { formSchema } from "@/lib/form-schema";
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from "@/components/ui/form";

type FormValues = z.infer<typeof formSchema>;
export default function FamilyEquipment({
  form,
}: {
  form: UseFormReturn<FormValues>;
}) {
  const hasYoungChild = form.watch("hasYoungChild");
  const question = (
    name: "hasYoungChild" | "hasChildcareSupport" | "hasLaptop",
    label: string,
    note: string,
  ) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={`rounded-xl border p-4 transition-colors ${field.value ? "border-blue-300 bg-blue-50/60" : "border-slate-200 bg-white"}`}
        >
          <div className="flex items-start gap-3">
            <input
              id={name}
              name={field.name}
              type="checkbox"
              checked={!!field.value}
              ref={field.ref}
              onBlur={field.onBlur}
              onChange={(event) => {
                field.onChange(event.target.checked);
                if (name === "hasYoungChild" && !event.target.checked)
                  form.setValue("hasChildcareSupport", false);
              }}
              aria-describedby={`${name}-description`}
              className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#193f60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
            <div className="space-y-1">
              <FormLabel
                htmlFor={name}
                className="cursor-pointer text-base font-medium text-slate-800"
              >
                {label}
              </FormLabel>
              <FormDescription id={`${name}-description`}>
                {note}
              </FormDescription>
            </div>
          </div>
        </FormItem>
      )}
    />
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-700">
          Family and Equipment
        </h2>
        <p className="text-sm text-muted-foreground">
          Tell us about the support and equipment available to you.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {question(
          "hasYoungChild",
          "I have a young child",
          "This helps us understand your childcare needs.",
        )}
        {hasYoungChild &&
          question(
            "hasChildcareSupport",
            "Do You need childcare support",
            "Support to care for your child while you attend the program.",
          )}
        {question(
          "hasLaptop",
          "I have a laptop",
          "A laptop you can use during the program.",
        )}
      </div>
    </div>
  );
}
