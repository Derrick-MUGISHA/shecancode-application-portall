import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Users, BookOpen } from "lucide-react"

export default function AdminHeader() {
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
              <li>
                <Link href="/">
                  <Button variant="date" size="sm" className="flex items-center text-gray-700 hover:bg-primary hover:text-white">
                    <Home className="mr-2 h-4 w-4" />
                    Home
                  </Button>
                </Link>
              </li>
              <li>
                <Link href="/admin/applications">
                  <Button variant="date" size="sm" className="flex items-center text-gray-700 hover:bg-primary hover:text-white">
                    <Users className="mr-2 h-4 w-4" />
                    Applications
                  </Button>
                </Link>
              </li>
              <li>
                <Link href="/admin/courses">
                  <Button variant="date" size="sm" className="flex items-center text-gray-700 hover:bg-primary hover:text-white">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Courses
                  </Button>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  )
}
