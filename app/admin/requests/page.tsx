"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layouts/header";
import { useToast } from "@/components/ui/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { UserPlus, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  getPendingAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
} from "@/lib/supabase/rpc";

interface AccessRequest {
  id: string;
  device_id: string;
  requested_name: string;
  status: string;
  created_at: string;
}

export default function AdminRequestsPage() {
  const router = useRouter();
  const { authenticated, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!authenticated || !isAdmin)) {
      router.push("/");
    }
  }, [authenticated, isAdmin, authLoading, router]);

  // Fetch pending requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await getPendingAccessRequests();

      if (error) {
        console.error("Error fetching requests:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load access requests",
        });
        return;
      }

      setRequests(data || []);
    } catch (error) {
      console.error("Error in fetchRequests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated && isAdmin) {
      fetchRequests();
    }
  }, [authenticated, isAdmin]);

  const handleApprove = async (requestId: string, requestedName: string) => {
    setProcessingIds((prev) => new Set(prev).add(requestId));

    try {
      const { data, error } = await approveAccessRequest(requestId, requestedName);

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Request Approved",
          description: `${requestedName} has been granted access`,
        });
        // Refresh the list
        await fetchRequests();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data?.message || "Failed to approve request",
        });
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve request",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleReject = async (requestId: string, requestedName: string) => {
    setProcessingIds((prev) => new Set(prev).add(requestId));

    try {
      const { data, error } = await rejectAccessRequest(requestId);

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Request Rejected",
          description: `Access request from ${requestedName} has been rejected`,
        });
        // Refresh the list
        await fetchRequests();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data?.message || "Failed to reject request",
        });
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject request",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!authenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Access Requests</h1>
              <p className="text-muted-foreground mt-2">Review and approve user access requests</p>
            </div>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>

          {requests.length === 0 ? (
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-muted">
                    <Clock className="h-12 w-12 text-muted-foreground" />
                  </div>
                </div>
                <CardTitle>No Pending Requests</CardTitle>
                <CardDescription>There are no access requests waiting for review</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <UserPlus className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold">{request.requested_name}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Requested {new Date(request.created_at).toLocaleDateString()} at{" "}
                            {new Date(request.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Device ID</p>
                          <p className="text-sm font-mono break-all">{request.device_id}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(request.id, request.requested_name)}
                          disabled={processingIds.has(request.id)}
                        >
                          {processingIds.has(request.id) ? (
                            <Spinner size="sm" className="mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(request.id, request.requested_name)}
                          disabled={processingIds.has(request.id)}
                        >
                          {processingIds.has(request.id) ? (
                            <Spinner size="sm" className="mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
