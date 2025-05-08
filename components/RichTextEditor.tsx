"use client"

import { useEffect, useRef, useState } from "react"
import { Editor } from "@tinymce/tinymce-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Code as CodeIcon,
  Quote,
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Smile,
  X,
} from "lucide-react"
import DOMPurify from "isomorphic-dompurify"
import { put } from "@vercel/blob"
import { toast } from "@/components/ui/use-toast"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  maxLength?: number
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  className,
  maxLength = 5000,
}: RichTextEditorProps) {
  const [isClient, setIsClient] = useState(false)
  const editorRef = useRef<any>(null)

  // Ensure client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Handle image upload to Vercel Blob
  const handleImageUpload = async (blobInfo: any, success: (url: string) => void, failure: (err: string) => void) => {
    try {
      const file = blobInfo.blob()
      if (file.size > 5 * 1024 * 1024) {
        failure("Image size must be less than 5MB")
        return
      }
      const { url } = await put(`images/${Date.now()}-${file.name}`, file, {
        access: "public",
      })
      success(url)
    } catch (error) {
      failure("Failed to upload image")
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      })
    }
  }

  // Toolbar button component
  const ToolbarButton = ({
    icon: Icon,
    onClick,
    isActive,
    label,
    disabled,
  }: {
    icon: React.ElementType
    onClick: () => void
    isActive?: boolean
    label: string
    disabled?: boolean
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "hover:bg-gray-100 transition-colors",
              isActive ? "bg-blue-100 text-blue-700" : "",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  if (!isClient) {
    return <div className="p-4 text-gray-500">Loading editor...</div>
  }

  return (
    <div className={cn("border rounded-md bg-white", className)} aria-label="Rich text editor">
      {/* Custom Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50" role="toolbar">
        <ToolbarButton
          icon={Bold}
          onClick={() => editorRef.current?.execCommand("Bold")}
          isActive={editorRef.current?.queryCommandState("Bold")}
          label="Bold"
        />
        <ToolbarButton
          icon={Italic}
          onClick={() => editorRef.current?.execCommand("Italic")}
          isActive={editorRef.current?.queryCommandState("Italic")}
          label="Italic"
        />
        <ToolbarButton
          icon={UnderlineIcon}
          onClick={() => editorRef.current?.execCommand("Underline")}
          isActive={editorRef.current?.queryCommandState("Underline")}
          label="Underline"
        />
        <ToolbarButton
          icon={Heading1}
          onClick={() => editorRef.current?.execCommand("FormatBlock", false, "h1")}
          isActive={editorRef.current?.queryCommandValue("FormatBlock") === "h1"}
          label="Heading 1"
        />
        <ToolbarButton
          icon={Heading2}
          onClick={() => editorRef.current?.execCommand("FormatBlock", false, "h2")}
          isActive={editorRef.current?.queryCommandValue("FormatBlock") === "h2"}
          label="Heading 2"
        />
        <ToolbarButton
          icon={List}
          onClick={() => editorRef.current?.execCommand("InsertUnorderedList")}
          isActive={editorRef.current?.queryCommandState("InsertUnorderedList")}
          label="Bullet List"
        />
        <ToolbarButton
          icon={ListOrdered}
          onClick={() => editorRef.current?.execCommand("InsertOrderedList")}
          isActive={editorRef.current?.queryCommandState("InsertOrderedList")}
          label="Numbered List"
        />
        <ToolbarButton
          icon={Quote}
          onClick={() => editorRef.current?.execCommand("FormatBlock", false, "blockquote")}
          isActive={editorRef.current?.queryCommandValue("FormatBlock") === "blockquote"}
          label="Blockquote"
        />
        <ToolbarButton
          icon={AlignLeft}
          onClick={() => editorRef.current?.execCommand("JustifyLeft")}
          isActive={editorRef.current?.queryCommandState("JustifyLeft")}
          label="Align Left"
        />
        <ToolbarButton
          icon={AlignCenter}
          onClick={() => editorRef.current?.execCommand("JustifyCenter")}
          isActive={editorRef.current?.queryCommandState("JustifyCenter")}
          label="Align Center"
        />
        <ToolbarButton
          icon={AlignRight}
          onClick={() => editorRef.current?.execCommand("JustifyRight")}
          isActive={editorRef.current?.queryCommandState("JustifyRight")}
          label="Align Right"
        />
        <ToolbarButton
          icon={LinkIcon}
          onClick={() => {
            const url = window.prompt("Enter the URL (e.g., https://example.com):")
            if (url && /^https?:\/\//.test(url)) {
              editorRef.current?.execCommand("mceInsertLink", false, url)
            } else if (url) {
              toast({
                title: "Invalid URL",
                description: "Please enter a valid URL starting with http:// or https://",
                variant: "destructive",
              })
            }
          }}
          isActive={editorRef.current?.selection?.getNode()?.tagName === "A"}
          label="Insert Link"
        />
        <ToolbarButton
          icon={ImageIcon}
          onClick={() => editorRef.current?.execCommand("mceImage")}
          label="Insert Image"
        />
        <ToolbarButton
          icon={TableIcon}
          onClick={() => editorRef.current?.execCommand("mceInsertTable", false, { rows: 3, columns: 3 })}
          label="Insert Table"
        />
        <ToolbarButton
          icon={CodeIcon}
          onClick={() => editorRef.current?.execCommand("mceCodeEditor")}
          label="Code Block"
        />
        <ToolbarButton
          icon={Smile}
          onClick={() => editorRef.current?.execCommand("mceEmoticons")}
          label="Insert Emoji"
        />
        <ToolbarButton
          icon={X}
          onClick={() => editorRef.current?.execCommand("RemoveFormat")}
          label="Clear Formatting"
        />
        <ToolbarButton
          icon={Undo}
          onClick={() => editorRef.current?.execCommand("Undo")}
          disabled={!editorRef.current?.undoManager?.hasUndo()}
          label="Undo"
        />
        <ToolbarButton
          icon={Redo}
          onClick={() => editorRef.current?.execCommand("Redo")}
          disabled={!editorRef.current?.undoManager?.hasRedo()}
          label="Redo"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (editorRef.current) {
              const current = editorRef.current.settings.spellchecker
              editorRef.current.settings.spellchecker = !current
              editorRef.current.getBody().spellcheck = !current
            }
          }}
          className={cn(
            "hover:bg-gray-100 transition-colors",
            editorRef.current?.settings?.spellchecker ? "bg-blue-100 text-blue-700" : ""
          )}
          aria-label={editorRef.current?.settings?.spellchecker ? "Disable spell check" : "Enable spell check"}
        >
          <span className="text-sm">Spellcheck</span>
        </Button>
      </div>

      {/* TinyMCE Editor */}
      <Editor
        apiKey={process.env.TINYMCE_API_KEY || ""}
        onInit={(_evt, editor) => {
          editorRef.current = editor
        }}
        value={value}
        onEditorChange={(newValue) => {
          const sanitized = DOMPurify.sanitize(newValue, {
            ADD_TAGS: ["iframe"],
            ADD_ATTR: ["allowfullscreen"],
          })
          onChange(sanitized)
        }}
        init={{
          height: 300,
          menubar: false,
          plugins: [
            "advlist",
            "autolink",
            "lists",
            "link",
            "image",
            "charmap",
            "preview",
            "anchor",
            "searchreplace",
            "visualblocks",
            "code",
            "codesample",
            "fullscreen",
            "insertdatetime",
            "media",
            "table",
            "code",
            "wordcount",
            "emoticons",
            "spellchecker",
          ],
          toolbar: false, // Use custom toolbar
          content_style: `
            body {
              font-family: Inter, sans-serif;
              font-size: 16px;
              padding: 16px;
              width: 100%;
              text-align: left;
              white-space: normal;
              word-break: break-word;
            }
            p, h1, h2, blockquote, ul, ol {
              margin: 0 0 16px 0;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          `,
          placeholder,
          max_chars: maxLength,
          images_upload_handler: handleImageUpload,
          browser_spellcheck: true,
          statusbar: true,
          elementpath: false,
          wordcount: true,
          branding: false,
          skin: "oxide",
          content_css: "default",
          setup: (editor: any) => {
            editor.on("Change", () => {
              editor.save() // Ensure content is synced
            })
          },
        }}
        textareaName="editor-content"
        aria-label="Email body editor"
      />

      {/* Word Count */}
      <div className="p-2 text-sm text-gray-500">
        Words: {editorRef.current?.plugins?.wordcount?.getCount() || 0}
      </div>
    </div>
  )
}