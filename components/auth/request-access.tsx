"use client";

import { useState } from "react";
import { requestAccess } from "@/lib/supabase/rpc";
import { DeviceIdService } from "@/lib/auth/device-id";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, UserPlus, Clock } from "lucide-react";

type RequestStatus = "idle" | "submitting" | "success" | "pending" | "approved" | "rejected";

export function RequestAccess() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setMessage("Please enter your name");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const deviceId = DeviceIdService.getOrCreateDeviceId();

      const { data, error } = await requestAccess(deviceId, name.trim());

      if (error) throw error;

      if (data?.success) {
        setStatus("success");
        setMessage("Your access request has been submitted! An admin will review it soon.");
      } else {
        // Request already exists
        setStatus("pending");
        setMessage(data?.message || "A request from this device already exists.");
      }
    } catch (error) {
      console.error("Error submitting access request:", error);
      setMessage("Failed to submit request. Please try again.");
      setStatus("idle");
    }
  };

  if (status === "success" || status === "pending") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-blue-100">
              <Clock className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <CardTitle>Request Submitted</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>What's next?</strong>
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
              <li>An admin will review your request</li>
              <li>You'll be able to access the app once approved</li>
              <li>Check back later or refresh this page</li>
            </ul>
          </div>

          <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-blue-100">
            <UserPlus className="h-12 w-12 text-blue-600" />
          </div>
        </div>
        <CardTitle>Request Access</CardTitle>
        <CardDescription>Enter your name to request access to the Pushup Tracker</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={status === "submitting"}
              required
              autoFocus
            />
          </div>

          {message && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-900">{message}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={status === "submitting" || !name.trim()}
          >
            {status === "submitting" ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
