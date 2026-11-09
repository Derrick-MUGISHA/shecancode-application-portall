import type { Program } from "./program-types"

export const PROGRAM_STORAGE_KEY = "applicationPrograms:v2"
export const PROGRAM_CACHE_TTL = 60_000
export const DRAFT_STORAGE_KEY = "applicationFormData"

export function encodeDraft(values: Record<string, unknown>, step: number) {
  const { identificationNumber, educationDocument, ...answers } = values
  return JSON.stringify({ version: 2, step, values: answers })
}

export function decodeDraft(raw: string) {
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
  const values = parsed.version === 2 ? parsed.values : parsed
  if (!values || typeof values !== "object" || Array.isArray(values)) return null
  const { identificationNumber, educationDocument, ...answers } = values
  return {
    values: answers as Record<string, unknown>,
    step: parsed.version === 2 && Number.isInteger(parsed.step) && parsed.step >= 0 && parsed.step < 4 ? parsed.step as number : 0,
  }
}

export function encodeProgramCache(programs: Program[], now = Date.now()) {
  return JSON.stringify({ version: 1, savedAt: now, programs })
}

export function decodeProgramCache(raw: string, now = Date.now()): { programs: Program[]; fresh: boolean } | null {
  const value = JSON.parse(raw)
  if (value?.version !== 1 || !Array.isArray(value.programs) || typeof value.savedAt !== "number") return null
  if (!value.programs.every((program: Program) => typeof program.id === "string" && typeof program.name === "string")) return null
  return { programs: value.programs, fresh: now >= value.savedAt && now - value.savedAt < PROGRAM_CACHE_TTL }
}

export function applicationStepFromQuery(value: unknown) {
  return typeof value === "string" && /^[1-4]$/.test(value) ? Number(value) - 1 : 0
}
