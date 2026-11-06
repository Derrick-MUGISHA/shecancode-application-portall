export type ProgramAvailability = {
  isOpen?: boolean
  capacity?: number | null
  closesAt?: string | Date | null
  serverTime?: string
  clientReceivedAt?: number
  applicationCount?: number
  _count?: { applications: number }
}

export function remainingSpaces(program: ProgramAvailability) {
  return program.capacity == null ? null : Math.max(0, program.capacity - (program._count?.applications ?? program.applicationCount ?? 0))
}

export function acceptingApplications(program: ProgramAvailability, now = Date.now()) {
  return program.isOpen !== false &&
    (program.closesAt == null || new Date(program.closesAt).getTime() > now) &&
    (remainingSpaces(program) == null || remainingSpaces(program)! > 0)
}

export function countdownParts(closesAt: string | Date, now: number) {
  const seconds = Math.max(0, Math.ceil((new Date(closesAt).getTime() - now) / 1000))
  return { days: Math.floor(seconds / 86400), hours: Math.floor(seconds / 3600) % 24, minutes: Math.floor(seconds / 60) % 60, seconds: seconds % 60, expired: seconds === 0 }
}

export function kigaliDateTimeInput(value: string | Date | null | undefined) {
  if (!value) return ""
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? "" : new Date(time + 2 * 3600000).toISOString().slice(0, 16)
}

export function programClock(program: ProgramAvailability, now = Date.now()) {
  return program.serverTime && program.clientReceivedAt ? now + new Date(program.serverTime).getTime() - program.clientReceivedAt : now
}
