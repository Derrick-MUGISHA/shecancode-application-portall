import { NextResponse } from "next/server"
import { LOCATION_LEVELS, rwandaLocationOptions, type LocationLevel, type LocationValues } from "@/lib/rwanda-locations"

export function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const level = params.get("level") as LocationLevel
  if (!LOCATION_LEVELS.includes(level)) return NextResponse.json({ message: "Invalid location level." }, { status: 400 })
  const parents: LocationValues = {}
  for (const name of LOCATION_LEVELS) parents[name] = params.get(name)?.slice(0, 150) || ""
  return NextResponse.json(rwandaLocationOptions(level, parents), { headers: { "Cache-Control": "public, max-age=86400" } })
}
