"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { DeviceIdService } from "@/lib/auth/device-id";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layouts/header";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type InvitationStatus =
  | "validating"
  | "valid"
  | "invalid"
  | "expired"
  | "used"
  | "creating"
  | "success"
  | "error";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { deviceId, refreshProfile } = useAuth();
  const [status, setStatus] = useState<InvitationStatus>("validating");
  const [invitationEmail, setInvitationEmail] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const supabase = createClient();

  useEffect(() => {
    const acceptInvitation = async () => {
      const token = params.token as string;

      if (!token) {
        setStatus("invalid");
        return;
      }

      try {
        // Step 1: Validate invitation token
        setStatus("validating");
        const { data: invitation, error: inviteError } = await supabase
          .from("invitations")
          .select("*")
          .eq("token", token)
          .single();

        if (inviteError || !invitation) {
          setStatus("invalid");
          setErrorMessage("Invalid invitation link");
          return;
        }

        // Check if already used
        // @ts-expect-error - Types will be correct after migration
        if (invitation.used_at) {
          setStatus("used");
          // @ts-expect-error - Types will be correct after migration
          setInvitationEmail(invitation.email);
          return;
        }

        // Check if expired
        // @ts-expect-error - Types will be correct after migration
        const expiresAt = new Date(invitation.expires_at);
        if (expiresAt < new Date()) {
          setStatus("expired");
          return;
        }

        setStatus("valid");
        // @ts-expect-error - Types will be correct after migration
        setInvitationEmail(invitation.email);

        // Step 2: Get device ID and device info
        const currentDeviceId = deviceId || DeviceIdService.getOrCreateDeviceId();
        const deviceInfo = DeviceIdService.getDeviceInfo();
        const fingerprint = DeviceIdService.generateFingerprint();

        // Step 3: Create device-based user
        setStatus("creating");
        // @ts-expect-error - Types will be correct after migration
        const { error: createError } = await supabase.rpc("create_device_user", {
          p_device_id: currentDeviceId,
          p_device_name: deviceInfo.name,
          p_device_fingerprint: fingerprint,
          // @ts-expect-error - Types will be correct after migration
          p_email: invitation.email,
          // @ts-expect-error - Types will be correct after migration
          p_invited_by: invitation.invited_by,
        });

        if (createError) {
          console.error("Error creating device user:", createError);
          setStatus("error");
          setErrorMessage("Failed to create account. Please try again.");
          return;
        }

        // Step 4: Mark invitation as used
        await supabase
          .from("invitations")
          // @ts-expect-error - Types will be correct after migration
          .update({
            used_at: new Date().toISOString(),
            device_id: currentDeviceId,
            device_name: deviceInfo.name,
          })
          // @ts-expect-error - Types will be correct after migration
          .eq("id", invitation.id);

        // Step 5: Refresh profile to authenticate
        await refreshProfile();

        setStatus("success");

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } catch (error) {
        console.error("Error accepting invitation:", error);
        setStatus("error");
        setErrorMessage("An unexpected error occurred");
      }
    };

    acceptInvitation();
  }, [params.token, deviceId, refreshProfile, router, supabase]);

  const renderContent = () => {
    switch (status) {
      case "validating":
        return (
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <CardTitle>Validating Invitation</CardTitle>
              <CardDescription>Please wait while we verify your invitation...</CardDescription>
            </CardHeader>
          </Card>
        );

      case "valid":
      case "creating":
        return (
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <CardTitle>Setting Up Your Account</CardTitle>
              <CardDescription>Creating your profile for {invitationEmail}...</CardDescription>
            </CardHeader>
          </Card>
        );

      case "success":
        return (
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Welcome to Pushup Tracker!</CardTitle>
              <CardDescription>Your account has been activated</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-center text-muted-foreground">
                Redirecting you to your dashboard...
              </p>
            </CardContent>
          </Card>
        );

      case "invalid":
        return (
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle>Invalid Invitation</CardTitle>
              <CardDescription>
                {errorMessage || "This invitation link is not valid"}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => router.push("/")}>Go to Home</Button>
            </CardContent>
          </Card>
        );

      case "expired":
        return (
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                <XCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <CardTitle>Invitation Expired</CardTitle>
              <CardDescription>This invitation has expired</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Please request a new invitation from an admin.
              </p>
              <div className="flex justify-center">
                <Button onClick={() => router.push("/")}>Go to Home</Button>
              </div>
            </CardContent>
          </Card>
        );

      case "used":
        return (
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                <XCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <CardTitle>Already Used</CardTitle>
              <CardDescription>This invitation has already been accepted</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                This invitation for {invitationEmail} has already been used on another device.
              </p>
              <div className="flex justify-center">
                <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        );

      case "error":
        return (
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle>Error</CardTitle>
              <CardDescription>{errorMessage || "Something went wrong"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Please try again or contact an admin for help.
              </p>
              <div className="flex justify-center">
                <Button onClick={() => router.push("/")}>Go to Home</Button>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">{renderContent()}</main>
    </div>
  );
}
