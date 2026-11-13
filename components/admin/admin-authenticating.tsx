"use client"

import AuthenticatingScreen from "../authenticating-screen"

export default function AdminAuthenticating({ description = "Verifying your administrator access. Please wait." }: { description?: string }) {
  return <AuthenticatingScreen description={description} />
}
