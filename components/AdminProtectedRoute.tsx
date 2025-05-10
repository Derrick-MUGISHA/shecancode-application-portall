// components/AdminProtectedRoute.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/admin/login');
        return;
      }

      try {
        const idToken = await user.getIdTokenResult();
        
        // Check both Firebase auth and cookie
        const hasAdminCookie = document.cookie.includes('adminSession=true');
        
        if (
          typeof idToken.claims.email === "string" &&
          idToken.claims.email.includes("igirerwanda") &&
          hasAdminCookie
        ) {
          setIsAuthenticated(true);
          setIsLoading(false);
        } else {
          await auth.signOut();
          // Clear the admin cookie
          document.cookie = "adminSession=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
          router.push('/admin/login');
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        router.push('/admin/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
}