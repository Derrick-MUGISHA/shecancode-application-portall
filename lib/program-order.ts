// New records come first until an administrator chooses a saved display order.
export type OrderedProgram = { id: string; createdAt?: string | Date; displayOrder?: number | null }
export function compareProgramOrder(a: OrderedProgram, b: OrderedProgram) {
  const rank = (item: OrderedProgram) => item.displayOrder ?? -new Date(item.createdAt || 0).getTime()
  return rank(a) - rank(b) || b.id.localeCompare(a.id)
}
export function moveProgram<T extends { id: string }>(items: T[], source: string, target: string): T[] {
  const from = items.findIndex(item => item.id === source)
  const to = items.findIndex(item => item.id === target)
  if (from < 0 || to < 0 || from === to) return items
  const next = [...items]
  next.splice(to, 0, next.splice(from, 1)[0])
  return next
}
