"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { DeviceIdService } from "@/lib/auth/device-id";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/layouts/header";
import { useToast } from "@/components/ui/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Shield, CheckCircle } from "lucide-react";

export default function AdminSetupPage() {
  const router = useRouter();
  const { authenticated, isAdmin, deviceId, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingAdmins, setCheckingAdmins] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const supabase = createClient();

  // Check if admin already exists
  useEffect(() => {
    const checkForAdmins = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_admin", true)
          .limit(1);

        if (error) {
          console.error("Error checking for admins:", error);
          return;
        }

        setAdminExists(data && data.length > 0);
      } catch (error) {
        console.error("Error in checkForAdmins:", error);
      } finally {
        setCheckingAdmins(false);
      }
    };

    checkForAdmins();
  }, [supabase]);

  // If already authenticated as admin, redirect to admin panel
  useEffect(() => {
    if (!checkingAdmins && authenticated && isAdmin) {
      router.push("/admin");
    }
  }, [authenticated, isAdmin, checkingAdmins, router]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get device ID and device info
      const currentDeviceId = deviceId || (await DeviceIdService.getOrCreateDeviceId());
      const deviceInfo = DeviceIdService.getDeviceInfo();
      const fingerprint = await DeviceIdService.generateFingerprint();

      // Create admin user
      // @ts-expect-error - Types will be correct after migration
      const { data, error: createError } = await supabase.rpc("create_device_user", {
        p_device_id: currentDeviceId,
        p_device_name: deviceInfo.name,
        p_device_fingerprint: fingerprint,
        p_email: email || null,
        p_invited_by: null,
      });

      const userId = data;

      if (createError) {
        console.error("Error creating admin user:", createError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create admin account. Please try again.",
        });
        return;
      }

      // Update profile to set is_admin and display_name
      await supabase
        .from("profiles")
        // @ts-expect-error - Types will be correct after migration
        .update({
          is_admin: true,
          display_name: displayName || null,
        })
        // @ts-expect-error - Types will be correct after migration
        .eq("id", userId);

      toast({
        title: "Success!",
        description: "Admin account created successfully.",
      });

      // Refresh profile to authenticate
      await refreshProfile();

      // Redirect to admin panel
      setTimeout(() => {
        router.push("/admin");
      }, 1000);
    } catch (error) {
      console.error("Error in admin setup:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAdmins) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // If admin already exists and user is not authenticated, show error
  if (adminExists && !authenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                <Shield className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <CardTitle>Admin Already Exists</CardTitle>
              <CardDescription>
                An admin has already been set up for this application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                To become an admin, please contact the existing admin for an invitation.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => router.push("/")}>
                Go to Home
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  // If user is already authenticated but not admin, show error
  if (authenticated && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle>Not Authorized</CardTitle>
              <CardDescription>You are already logged in as a regular user</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-center text-muted-foreground">
                Admin setup is only available for new devices.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </main>
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
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Admin Setup</CardTitle>
            <CardDescription>Set up the first admin account for Pushup Tracker</CardDescription>
          </CardHeader>
          <form onSubmit={handleSetup}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (Optional)</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  This is how you'll be identified in the app
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Used for sending invitations and receiving notifications
                </p>
              </div>

              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    You'll be able to invite other users
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    You'll have access to admin features and settings
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    This device will be permanently registered as an admin device
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Creating admin account...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Become Admin
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
