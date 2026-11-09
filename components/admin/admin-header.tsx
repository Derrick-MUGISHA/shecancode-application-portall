"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { adminSectionActive } from "@/lib/admin-navigation"
import { Home, Users, BookOpen, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function AdminHeader() {
  const pathname = usePathname()

  const navLinks = [
    { href: "/", label: "Application Portal", icon: Home },
    { href: "/admin/applications", label: "Applications", icon: Users },
    { href: "/admin/courses", label: "Courses", icon: BookOpen },
    { href: "/admin/emails", label: "Emails", icon: Mail },
  ]

  const router = useRouter();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      // Clear the cookie
      document.cookie = "adminSession=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      router.push("/admin/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="container mx-auto py-2 px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-6">
            <Link href="/admin/applications" aria-label="SheCanCode admin applications"><img src="/logo.png" alt="SheCanCode" width={100} height={73}/></Link>
            {/* <Link href="/" className="font-bold text-xl flex items-center text-gray-700">
              <Users className="mr-2 h-5 w-5" />
              <span>Admin Panel</span>
            </Link> */}
          </div>
          <nav aria-label="Admin navigation" className="order-3 w-full lg:order-none lg:w-auto">
            <ul className="flex flex-wrap items-center gap-2">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Button variant="date" size="sm" asChild className={cn("min-h-11 text-sm",adminSectionActive(pathname,href)?"bg-[#193f60] text-white hover:bg-[#285777]":"text-slate-700 hover:bg-slate-100")}>
                    <Link href={href} prefetch={true} aria-current={adminSectionActive(pathname,href)?"page":undefined}><Icon className="mr-2 h-4 w-4" aria-hidden="true"/>{label}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
          <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
        </div>
      </div>
    </header>
  )
}