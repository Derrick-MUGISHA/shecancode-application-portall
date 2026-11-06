// Rwanda NIN format: NISR National Data Quality Standards (2025), section 7.4.
// This checks the format only; it does not verify identity against a registry.
export function isRwandaNationalId(nationality: string, refugeeStatus: boolean) {
  return !refugeeStatus && nationality.trim().toLowerCase() === "rwanda"
}

export function normalizeIdentificationNumber(value: string, nationality: string, refugeeStatus: boolean) {
  return isRwandaNationalId(nationality, refugeeStatus) ? value.replace(/[\s-]/g, "") : value.trim()
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
  const number = normalizeIdentificationNumber(value, nationality, refugeeStatus)
  return isRwandaNationalId(nationality, refugeeStatus) && /^\d{16}$/.test(number) ? number.replace(/(\d{4})(?=\d)/g, "$1 ") : number
}

export function normalizeEmailAddress(value: string) {
  const text = value.trim()
  const at = text.lastIndexOf("@")
  return at < 0 ? text : text.slice(0, at + 1) + text.slice(at + 1).toLowerCase()
}
