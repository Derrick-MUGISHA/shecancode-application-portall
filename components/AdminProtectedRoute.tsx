// components/AdminProtectedRoute.tsx
'use client'

import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AdminAuthSkeleton } from "./admin/admin-skeletons";

const VerifiedAdminContext = createContext(false)

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const verified = useContext(VerifiedAdminContext)
  return verified ? <>{children}</> : <AdminSessionCheck>{children}</AdminSessionCheck>
}

function AdminSessionCheck({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAuthenticated(false);
        setIsLoading(true);
        queryClient.removeQueries({queryKey:["admin"]});
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
  }, [router, queryClient]);

  if (isLoading || !isAuthenticated) {
    return <AdminAuthSkeleton />;
  }

  return <VerifiedAdminContext.Provider value={true}>{children}</VerifiedAdminContext.Provider>;
}