import { getProvinces, validateHierarchy } from "rwanda-admin"

export const LOCATION_LEVELS = ["province", "district", "sector", "cell", "village"] as const
export type LocationLevel = typeof LOCATION_LEVELS[number]
export type LocationValues = Partial<Record<LocationLevel, string>>
type Node = { id: string; name: string; nameVariants?: string[]; districts?: Node[]; sectors?: Node[]; cells?: Node[]; villages?: Node[] }
const children = ["districts", "sectors", "cells", "villages"] as const
const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")

export function rwandaLocationOptions(level: LocationLevel, parents: LocationValues) {
  let nodes: Node[] = getProvinces()
  const target = LOCATION_LEVELS.indexOf(level)
  for (let index = 0; index < target; index++) {
    const value = normalize(parents[LOCATION_LEVELS[index]] || "")
    if (!value) return []
    const parent = nodes.find(node => [node.name, ...(node.nameVariants || [])].some(name => normalize(name) === value))
    if (!parent) return []
    nodes = parent[children[index]] || []
  }
  return nodes.map(node => ({ value: node.name, label: node.name, keywords: node.nameVariants || [] }))
}

export function validateRwandaAddress(values: LocationValues) {
  return validateHierarchy(values)
}
