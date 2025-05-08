"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react"
import DOMPurify from "isomorphic-dompurify"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({})
  const selectionRef = useRef<Range | null>(null)

  // Ensure component only renders client-side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Sync initial value to editor
  useEffect(() => {
    if (isClient && editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = DOMPurify.sanitize(value)
    }
  }, [value, isClient])

  // Save selection before formatting
  const saveSelection = useCallback(() => {
    if (typeof window === "undefined" || !editorRef.current) return
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      selectionRef.current = selection.getRangeAt(0)
    }
  }, [])

  // Restore selection after formatting
  const restoreSelection = useCallback(() => {
    if (typeof window === "undefined" || !editorRef.current || !selectionRef.current) return
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(selectionRef.current)
    }
  }, [])

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const sanitizedContent = DOMPurify.sanitize(editorRef.current.innerHTML)
      onChange(sanitizedContent)
      updateActiveFormats()
    }
  }, [onChange])

  // Update active formats based on cursor position
  const updateActiveFormats = useCallback(() => {
    if (typeof window === "undefined" || !editorRef.current) return
    const newActiveFormats: Record<string, boolean> = {
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
    }
    // Check for headings
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const parent = range.commonAncestorContainer.parentElement
      if (parent) {
        newActiveFormats.formatBlockH1 = parent.tagName === "H1"
        newActiveFormats.formatBlockH2 = parent.tagName === "H2"
      }
    }
    setActiveFormats(newActiveFormats)
  }, [])

  // Execute formatting commands
  const execCommand = useCallback((command: string, value?: string) => {
    if (typeof window === "undefined" || !editorRef.current) return
    saveSelection()
    document.execCommand(command, false, value)
    restoreSelection()
    editorRef.current.focus()
    handleInput()
  }, [handleInput, saveSelection, restoreSelection])

  // Insert link with prompt
  const insertLink = useCallback(() => {
    if (typeof window === "undefined") return
    saveSelection()
    const url = window.prompt("Enter the URL:")
    if (url) {
      execCommand("createLink", url)
    }
    restoreSelection()
  }, [execCommand, saveSelection, restoreSelection])

  // Prevent dragging the editor
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === editorRef.current) {
      e.preventDefault() // Prevent browser drag behavior
    }
  }, [])

  // Update active formats on mouse up (after selection)
  const handleMouseUp = useCallback(() => {
    updateActiveFormats()
  }, [updateActiveFormats])

  // Toolbar button component
  const ToolbarButton = ({
    icon: Icon,
    command,
    value,
    label,
  }: {
    icon: React.ElementType
    command: string
    value?: string
    label: string
  }) => {
    const isActive =
      command === "createLink"
        ? false // Links don't have a queryable state
        : value
        ? activeFormats[`${command}${value.toUpperCase()}`]
        : activeFormats[command]

    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault() // Prevent text selection
          value ? execCommand(command, value) : command === "createLink" ? insertLink() : execCommand(command)
        }}
        title={label}
        className={cn(
          "hover:bg-gray-100 transition-colors",
          isActive ? "bg-blue-100 text-blue-700" : ""
        )}
      >
        <Icon className="h-4 w-4" />
      </Button>
    )
  }

  if (!isClient) {
    return <div className="p-4 text-gray-500">Loading editor...</div>
  }

  return (
    <div className={cn("border rounded-md bg-white", className)}>
      <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
        <ToolbarButton icon={Bold} command="bold" label="Bold" />
        <ToolbarButton icon={Italic} command="italic" label="Italic" />
        <ToolbarButton icon={Underline} command="underline" label="Underline" />
        <ToolbarButton icon={List} command="insertUnorderedList" label="Bulleted List" />
        <ToolbarButton icon={ListOrdered} command="insertOrderedList" label="Numbered List" />
        <ToolbarButton icon={Link} command="createLink" label="Insert Link" />
        <ToolbarButton icon={Heading1} command="formatBlock" value="h1" label="Heading 1" />
        <ToolbarButton icon={Heading2} command="formatBlock" value="h2" label="Heading 2" />
        <ToolbarButton icon={AlignLeft} command="justifyLeft" label="Align Left" />
        <ToolbarButton icon={AlignCenter} command="justifyCenter" label="Align Center" />
        <ToolbarButton icon={AlignRight} command="justifyRight" label="Align Right" />
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className="min-h-[200px] p-4 outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }}
      />
    </div>
  )
}