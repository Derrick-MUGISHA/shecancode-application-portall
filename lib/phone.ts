export function normalizePhoneNumber(value: string) {
  const text = value.trim()
  if (!/^[+\d\s().-]+$/.test(text)) return text
  const compact = text.replace(/[\s().-]/g, "")
  if (/^0[27]\d{8}$/.test(compact)) return "+250" + compact.slice(1)
  if (/^250\d{9}$/.test(compact)) return "+" + compact
  if (/^00[1-9]\d{7,14}$/.test(compact)) return "+" + compact.slice(2)
  return compact
}

export function formatPhoneNumber(value: string) {
  const number = normalizePhoneNumber(value)
  return /^\+250\d{9}$/.test(number) ? number.replace(/^(\+250)(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4") : number
}

export function isValidPhoneNumber(value: string) {
  const normalized = normalizePhoneNumber(value)
  return normalized.startsWith("+250") ? /^\+250\d{9}$/.test(normalized) : /^\+[1-9]\d{7,14}$/.test(normalized)
}
