"use client";

import { useAuth } from "@/lib/auth/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layouts/header";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Mail, Clock } from "lucide-react";

export default function WaitingPage() {
  const { authenticated, loading, deviceId } = useAuth();
  const router = useRouter();

  // If user becomes authenticated while on this page, redirect to dashboard
  useEffect(() => {
    if (!loading && authenticated) {
      router.push("/dashboard");
    }
  }, [authenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Waiting for Invitation</CardTitle>
            <CardDescription>You need an invitation to access the Pushup Tracker</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This app is invitation-only. To get started, you'll need to receive an invitation from
              an admin.
            </p>
            <p className="text-sm text-muted-foreground">
              Once you receive an invitation email, click the link to activate your device and start
              tracking your pushups!
            </p>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-xs font-medium">Your Device ID:</p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {deviceId?.substring(0, 48)}...
              </p>
              <p className="text-xs text-muted-foreground">
                This device will be activated when you accept an invitation.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" asChild>
              <a href="mailto:admin@pushuptracker.com?subject=Invitation Request">
                <Mail className="h-4 w-4 mr-2" />
                Request an Invitation
              </a>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
