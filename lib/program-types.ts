export type CohortOption = {
  displayOrder?: number | null
  createdAt?: string
  id: string
  number: number
  cohortLabel: string
  capacity: number | null
  closesAt: string | null
  isOpen: boolean
  applicationCount: number
  spacesLeft: number | null
}

export type Program = {
  displayOrder?: number | null
  createdAt?: string
  requiresCohort?: boolean
  cohorts?: CohortOption[]
  id: string
  name: string
  description: string | null
  cohortLabel?: string | null
  capacity?: number | null
  closesAt?: string | null
  applicationCount?: number
  spacesLeft?: number | null
  isOpen?: boolean
  serverTime?: string
  clientReceivedAt?: number
}
