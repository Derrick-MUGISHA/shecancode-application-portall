export type AdminApplicationRow = {
  id: string; fullName: string; email: string; status: string; createdAt: string | Date
  cohort?: {id:string;number:number} | null
  cohortLabel?: string | null
  course: { id: string; name: string; cohortLabel?: string | null } | null
}
export type AdminFilters = { search: string; status: string; course: string; cohort: string; year: string; from: string; to: string; sort: string }
export const DEFAULT_ADMIN_FILTERS: AdminFilters = { search: "", status: "ALL", course: "ALL", cohort: "ALL", year: "ALL", from: "", to: "", sort: "newest" }
export const cohortOf = (row: AdminApplicationRow) => row.cohort ? `cohort-${row.cohort.number}` : row.cohortLabel || row.course?.cohortLabel || "UNASSIGNED"
export const cohortName = (value: string) => value === "UNASSIGNED" ? "Data not available" : value
export function kigaliDay(value: string | Date) {
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? "" : new Date(time + 7200000).toISOString().slice(0, 10)
}
const natural = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" })
export function filterAdminApplications<T extends AdminApplicationRow>(rows: T[], filters: AdminFilters): T[] {
  const search = filters.search.trim().toLowerCase()
  return rows.filter(row => {
    const day = kigaliDay(row.createdAt)
    return (!search || `${row.fullName} ${row.email}`.toLowerCase().includes(search)) &&
      (filters.status === "ALL" || row.status === filters.status) &&
      (filters.course === "ALL" || (row.course?.id || "unknown") === filters.course) &&
      (filters.cohort === "ALL" || cohortOf(row) === filters.cohort) &&
      (filters.year === "ALL" || day.slice(0,4) === filters.year) &&
      (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to)
  }).sort((a,b) => {
    const time = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    const comparison = filters.sort === "oldest" ? time : filters.sort === "name" ? natural(a.fullName,b.fullName) :
      filters.sort === "cohort" ? natural(cohortOf(a),cohortOf(b)) : filters.sort === "course" ? natural(a.course?.name || "",b.course?.name || "") :
      filters.sort === "status" ? natural(a.status,b.status) : -time
    return comparison || natural(a.id,b.id)
  })
}
export function paginateAdminRows<T>(rows: T[], requestedPage: number, requestedSize: number) {
  const size = [10,25,50,100].includes(requestedSize) ? requestedSize : 25
  const pages = Math.max(1,Math.ceil(rows.length / size))
  const page = Math.max(1,Math.min(pages,Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1))
  return { rows: rows.slice((page-1)*size,page*size), page, pages, size, start: rows.length ? (page-1)*size+1 : 0, end: Math.min(page*size,rows.length) }
}
export function summarizeAdminApplications(rows: AdminApplicationRow[]) {
  const statuses: Record<string,number> = {}, programs: Record<string,{name:string; count:number}> = {}, cohorts: Record<string,number> = {}, months: Record<string,number> = {}
  for (const row of rows) {
    statuses[row.status] = (statuses[row.status] || 0)+1
    const id = row.course?.id || "unknown"
    programs[id] ||= { name: row.course?.name || "Data not available", count: 0 }
    programs[id].count++
    const cohort = cohortOf(row); cohorts[cohort] = (cohorts[cohort] || 0)+1
    const month = kigaliDay(row.createdAt).slice(0,7)
    if (month) months[month] = (months[month] || 0)+1
  }
  const lastMonth = Object.keys(months).sort().at(-1)
  const trend: {month:string; count:number}[] = []
  if (lastMonth) {
    const end = new Date(`${lastMonth}-01T00:00:00Z`)
    for (let i=11;i>=0;i--) {
      const date = new Date(end); date.setUTCMonth(date.getUTCMonth()-i)
      const month = date.toISOString().slice(0,7); trend.push({ month, count: months[month] || 0 })
    }
  }
  return { total: rows.length, underReview: statuses.UNDER_REVIEW || 0, accepted: statuses.ACCEPTED || 0, followUp: statuses.NEEDS_FOLLOW_UP || 0, statuses, programs, cohorts, trend }
}
