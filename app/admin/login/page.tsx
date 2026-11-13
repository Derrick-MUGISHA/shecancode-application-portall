"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminApplicationsOptions } from "@/hooks/use-admin-applications";
import { adminProgramsOptions } from "@/hooks/use-admin-programs";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AdminAuthenticating from "@/components/admin/admin-authenticating";
import { LockIcon, AlertCircleIcon } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    router.prefetch("/admin/applications");
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const idToken = await user.getIdTokenResult();

      if (
        typeof idToken.claims.email === "string" &&
        idToken.claims.email.includes("igirerwanda")
      ) {
        document.cookie = `adminSession=true; path=/; secure; samesite=strict`;
        // Share these in-flight reads with the destination page. Navigation and
        // session verification proceed while the dashboard data is loading.
        void queryClient.prefetchQuery(adminApplicationsOptions(queryClient));
        void queryClient.prefetchQuery(adminProgramsOptions());
        router.replace("/admin/applications");
        return;
      } else {
        await auth.signOut();
        setError("You don't have permission to access the admin area.");
      }
    } catch (error) {
      setError("Failed to log in. Please check your credentials.");
      console.error(error);
    }
    setLoading(false);
  };

  if (loading) return <AdminAuthenticating description="Signing you in and preparing your admissions workspace." />;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LockIcon className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-700">
            Admin Login
          </h2>
          <p className="mt-2 text-sm text-gray-500 text-muted-foreground">
            Sign in to access the admin dashboard
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md">
            <div>
              <Label htmlFor="email" className="text-gray-700">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email..."
                className="mt-1 bg-white placeholder:bg-white placeholder:text-muted-foreground text-gray-700 border border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password..."
                className="mt-1 bg-white placeholder:text-muted-foreground text-gray-700 border border-gray-300"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
