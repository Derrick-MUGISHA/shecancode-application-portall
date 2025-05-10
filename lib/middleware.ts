// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const adminSession = request.cookies.get('adminSession')?.value

  // Protect admin routes
  if (path.startsWith('/admin')) {
    // Always allow access to login page
    if (path === '/admin/login') {
      // If already logged in, redirect to admin dashboard
      if (adminSession) {
        return NextResponse.redirect(new URL('/admin/applications', request.url))
      }
      return NextResponse.next()
    }

    // For all other admin routes, require adminSession
    if (!adminSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  } 
  // Redirect non-admin routes (except / and /apply) to /apply
  else if (path !== '/apply' && path !== '/') {
    return NextResponse.redirect(new URL('/apply', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api (API routes)
     * 2. /_next (Next.js internals)
     * 3. /static (inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. /favicon.ico, /sitemap.xml (static files)
     */
    '/((?!api|_next|static|_vercel|favicon.ico|sitemap.xml).*)',
  ]
}