"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { User, Settings } from "lucide-react";

export function Header() {
  const { profile, authenticated, isAdmin } = useAuth();

  // Display name: prefer display_name, fall back to email, then device_name
  const displayName = profile?.display_name || profile?.email || profile?.device_name || "User";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href={authenticated ? "/dashboard" : "/"} className="flex items-center space-x-2">
          <span className="font-bold">Pushup Tracker</span>
        </Link>

        <div className="flex items-center gap-4">
          {authenticated && profile ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{displayName}</span>
              </div>
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin">
                    <Settings className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                </Button>
              )}
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
