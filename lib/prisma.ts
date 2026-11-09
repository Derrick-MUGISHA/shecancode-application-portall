import { createHash } from "node:crypto"
import { Prisma, PrismaClient } from "@prisma/client"

// Reuse connections during hot reload, but never reuse a client generated for
// an older schema (for example, before cohort and attachment fields existed).
const schemaVersion = createHash("sha256").update(JSON.stringify(Prisma.dmmf.datamodel)).digest("hex")
const globalForPrisma = global as unknown as {
  prisma?: PrismaClient
  prismaSchemaVersion?: string
}
const cachedClient = globalForPrisma.prisma
const canReuse = cachedClient && globalForPrisma.prismaSchemaVersion === schemaVersion

export const prisma = canReuse ? cachedClient : new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  if (cachedClient && !canReuse) void cachedClient.$disconnect().catch(() => {})
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaSchemaVersion = schemaVersion
}

export default prisma
