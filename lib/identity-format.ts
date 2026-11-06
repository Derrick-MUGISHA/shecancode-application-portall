// Rwanda NIN format: NISR National Data Quality Standards (2025), section 7.4.
// This checks the format only; it does not verify identity against a registry.
export function isRwandaNationalId(nationality: string, refugeeStatus: boolean) {
  return !refugeeStatus && nationality.trim().toLowerCase() === "rwanda"
}

export function normalizeIdentificationNumber(value: string, nationality: string, refugeeStatus: boolean) {
  const compact=value.replace(/\s/g, "")
  return isRwandaNationalId(nationality, refugeeStatus) ? value.replace(/[\s-]/g, "") :
    refugeeStatus && /^\d{16}$/.test(compact) ? compact : value.trim()
}

export function identificationNumberError(value: string, nationality: string, refugeeStatus: boolean) {
  const number = normalizeIdentificationNumber(value, nationality, refugeeStatus)
  if (!number) return refugeeStatus ? "Enter your refugee registration number." : "Enter your ID number."
  if (isRwandaNationalId(nationality, refugeeStatus)) {
    return /^\d{16}$/.test(number) ? null : "Enter the 16 digits of your Rwanda national ID."
  }
  return /^[A-Za-z0-9][A-Za-z0-9 /-]{0,79}$/.test(number) ? null :
    "Use the letters, digits, spaces, slashes or hyphens shown on your identification document."
}

export function formatIdentificationNumber(value: string, nationality: string, refugeeStatus: boolean) {
  const number = refugeeStatus && /^[\d\s]+$/.test(value) ? value.replace(/\s/g, "") : normalizeIdentificationNumber(value, nationality, refugeeStatus)
  if ((!isRwandaNationalId(nationality, refugeeStatus) && !refugeeStatus) || !/^\d{1,16}$/.test(number)) return number
  // Card grouping: individual type / birth year / sex / serial / issue / checksum.
  const lengths = [1, 4, 1, 7, 1, 2]
  let offset = 0
  return lengths.map(length => {
    const group = number.slice(offset, offset + length)
    offset += length
    return group
  }).filter(Boolean).join(" ")
}

export function normalizeEmailAddress(value: string) {
  const text = value.trim()
  const at = text.lastIndexOf("@")
  return at < 0 ? text : text.slice(0, at + 1) + text.slice(at + 1).toLowerCase()
}

// Keep editing in the middle of a formatted value predictable, including deleting a space.
export function identificationInputEdit(raw: string, previous: string, caret: number, nationality: string, refugeeStatus: boolean, inputType = "") {
  if ((!isRwandaNationalId(nationality, refugeeStatus) && !refugeeStatus) || !/^[\d\s]*$/.test(raw) || raw.replace(/\s/g, "").length > 16) return { value: raw, caret }
  let digits = raw.replace(/\s/g, "")
  let before = raw.slice(0, caret).replace(/\s/g, "").length
  if (raw.length < previous.length && digits === previous.replace(/\s/g, "")) {
    const forward = inputType === "deleteContentForward"
    const index = forward ? before : before - 1
    if (index >= 0 && index < digits.length) {
      digits = digits.slice(0, index) + digits.slice(index + 1)
      if (!forward) before--
    }
  }
  const value = formatIdentificationNumber(digits, nationality, refugeeStatus)
  let position = 0, seen = 0
  while (position < value.length && seen < before) { if (/\d/.test(value[position])) seen++; position++ }
  return { value, caret: position }
}
