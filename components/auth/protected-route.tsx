"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { LoadingPage } from "@/components/ui/spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authenticated) {
      // Redirect to home page when not authenticated
      router.push("/");
    }
  }, [authenticated, loading, router]);

  if (loading) {
    return <LoadingPage />;
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
