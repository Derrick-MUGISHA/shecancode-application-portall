"use client"

import { useEffect, useRef, useState } from "react"
import { FileText, Upload, X } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import type { formSchema } from "@/lib/form-schema"
import { EDUCATION_DOCUMENT_ACCEPT, validateEducationFile } from "@/lib/education-document"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import styles from "./application-wizard.module.css"

export default function EducationAttachmentField({ form, optional }: { form: UseFormReturn<z.infer<typeof formSchema>>; optional: boolean }) {
  const input = useRef<HTMLInputElement | null>(null)
  const selection = useRef(0)
  const [checking, setChecking] = useState(false)
  const [selectionMessage, setSelectionMessage] = useState("")
  useEffect(() => () => { selection.current++ }, [])

  return <FormField control={form.control} name="educationDocument" render={({ field }) => (
    <FormItem>
      <FormLabel>Education Attachment {optional ? "(Optional)" : "(Required)"}</FormLabel>
      <div className={styles.attachmentBox} aria-busy={checking}>
        <div className={styles.attachmentHeading}><Upload size={20} aria-hidden="true" /><span>Choose your certificate, diploma or transcript</span></div>
        <FormControl>
          <input type="file" name={field.name} accept={EDUCATION_DOCUMENT_ACCEPT}
            ref={element => { input.current = element; field.ref(element) }}
            onBlur={field.onBlur} aria-required={!optional} disabled={checking}
            className={styles.filePicker}
            onChange={async event => {
              const element = event.currentTarget
              const file = element.files?.[0]
              const current = ++selection.current
              field.onChange(undefined)
              if (!file) { setSelectionMessage("No attachment selected."); return }
              setChecking(true)
              setSelectionMessage("Checking the file format and size…")
              const message = await validateEducationFile(file)
              if (selection.current !== current) return
              setChecking(false)
              if (message) {
                element.value = ""
                form.setError("educationDocument", { type: "validate", message })
                setSelectionMessage(message)
              } else {
                field.onChange(file)
                form.clearErrors("educationDocument")
                setSelectionMessage(`Selected ${file.name}, ${Math.ceil(file.size / 1024)} KB. File format checked.`)
              }
            }} />
        </FormControl>
        {field.value && <div className={styles.selectedFile}>
          <FileText size={18} aria-hidden="true" />
          <span>{field.value.name}<small>{Math.ceil(field.value.size / 1024)} KB · {field.value.type}</small></span>
          <button type="button" aria-label={`Remove attachment ${field.value.name}`} onClick={() => {
            selection.current++
            setChecking(false)
            if (input.current) input.current.value = ""
            field.onChange(undefined)
            setSelectionMessage("Attachment removed.")
          }}><X size={18} aria-hidden="true" /></button>
        </div>}
        <p role="status" aria-live="polite" aria-atomic="true" className={styles.fileStatus}>{selectionMessage || "No attachment selected."}</p>
      </div>
      <FormDescription>PDF, JPG or PNG, up to 2 MB. Files stay selected between steps. After a page reload, choose the file again.</FormDescription>
      <FormMessage />
    </FormItem>
  )} />
}
