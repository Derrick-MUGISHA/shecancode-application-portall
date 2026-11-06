export const MAX_EDUCATION_DOCUMENT_SIZE = 2 * 1024 * 1024
export const EDUCATION_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"]
export const EDUCATION_DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png"

export function educationDocumentError(file: { size: number; type: string; name: string }) {
  if (file.size === 0) return "The attachment is empty. Please choose another file."
  if (file.size > MAX_EDUCATION_DOCUMENT_SIZE) return "The attachment must be 2 MB or smaller."
  const extensions: Record<string, RegExp> = {
    "application/pdf": /\.pdf$/i,
    "image/jpeg": /\.jpe?g$/i,
    "image/png": /\.png$/i,
  }
  if (!extensions[file.type]?.test(file.name)) return "Please attach a PDF, JPG or PNG file."
  return null
}

export function matchesDocumentType(bytes: Uint8Array, type: string) {
  if (type === "application/pdf") return String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-"
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)
  return false
}

export async function validateEducationFile(file: File) {
  const message = educationDocumentError(file)
  if (message) return message
  try {
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer())
    return matchesDocumentType(bytes, file.type) ? null : "The file contents do not match its PDF, JPG or PNG format."
  } catch {
    return "This file could not be read. Please choose it again."
  }
}
