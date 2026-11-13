"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import AdminProtectedRoute from "@/components/AdminProtectedRoute"

// The layout keeps the verified session mounted while moving between admin pages.
export default function AdminSessionBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === "/admin/login") return <>{children}</>
  return <AdminProtectedRoute>{children}</AdminProtectedRoute>
}
