"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layouts/header";
import { RequestAccess } from "@/components/auth/request-access";

export default function Home() {
  const router = useRouter();
  const { authenticated, loading } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && authenticated) {
      router.push("/dashboard");
    }
  }, [authenticated, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (showRequestForm) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <RequestAccess />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">Pushup Tracker</h1>
            <p className="text-2xl text-muted-foreground">36,500 pushups in 2026</p>
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>The Challenge</CardTitle>
              <CardDescription>Complete 100 pushups every day for an entire year</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Daily Goal</span>
                  <span className="text-2xl font-bold">100 pushups</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Days</span>
                  <span className="text-2xl font-bold">365 days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Goal</span>
                  <span className="text-2xl font-bold">36,500 pushups</span>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={() => setShowRequestForm(true)}>
                Request Access
              </Button>
            </CardContent>
          </Card>

          <Card id="features">
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>Everything you need to stay on track</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <p className="text-sm">
                  <strong>Smart Progression:</strong> Adaptive algorithm adjusts your daily targets
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <p className="text-sm">
                  <strong>Achievements:</strong> Unlock 30+ badges across 7 categories
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <p className="text-sm">
                  <strong>Offline-First:</strong> Full functionality without internet
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <p className="text-sm">
                  <strong>Notifications:</strong> Daily reminders and milestone celebrations
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
