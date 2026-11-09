import { verify } from "node:crypto"

let certificates: { keys: Record<string, string>; expiresAt: number } | undefined

// Firebase token constraints: https://firebase.google.com/docs/auth/admin/verify-id-tokens
export async function canDownloadEducationDocument(request: Request) {
  try {
    const token = request.headers.get("authorization")?.match(/^Bearer ([\w.-]+)$/)?.[1]
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (!token || !projectId) return false
    const parts = token.split(".")
    if (parts.length !== 3) return false
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString())
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString())
    const now = Date.now() / 1000
    if (header.alg !== "RS256" || typeof header.kid !== "string" ||
      claims.aud !== projectId || claims.iss !== "https://securetoken.google.com/" + projectId ||
      typeof claims.exp !== "number" || claims.exp <= now ||
      typeof claims.iat !== "number" || claims.iat > now ||
      typeof claims.auth_time !== "number" || claims.auth_time > now ||
      typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 128 ||
      typeof claims.email !== "string" || !claims.email.toLowerCase().endsWith("@igirerwanda.org")) return false

    if (!certificates || certificates.expiresAt <= Date.now()) {
      const response = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com", {
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) return false
      const maxAge = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] || 0)
      certificates = { keys: await response.json(), expiresAt: Date.now() + maxAge * 1000 }
    }
    const certificate = Object.prototype.hasOwnProperty.call(certificates.keys, header.kid) ? certificates.keys[header.kid] : undefined
    return !!certificate && verify("RSA-SHA256", Buffer.from(parts[0] + "." + parts[1]), certificate, Buffer.from(parts[2], "base64url"))
  } catch {
    return false
  }
}
