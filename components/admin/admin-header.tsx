"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Users, BookOpen, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import ModeToggle from "../ModeToggle"

export default function AdminHeader() {
  const pathname = usePathname()

  const navLinks = [
    { href: "/", label: "Application Portal", icon: Home },
    { href: "/admin/applications", label: "Applications", icon: Users },
    { href: "/admin/courses", label: "Courses", icon: BookOpen },
    { href: "/admin/emails", label: "Emails", icon: Mail },
  ]

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto py-2 px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <img src="/logo.png" alt="logo" width={100} height={20} />
            <Link href="/" className="font-bold text-xl flex items-center text-gray-700">
              <Users className="mr-2 h-5 w-5" />
              <span>Admin Panel</span>
            </Link>
          </div>
          <nav>
            <ul className="flex space-x-4">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link href={href}>
                    <Button
                      variant="date"
                      size="sm"
                      className={cn(
                        "flex items-center text-gray-700",
                        pathname === href
                          ? "bg-primary text-white"
                          : "hover:bg-primary hover:text-white"
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {label}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}