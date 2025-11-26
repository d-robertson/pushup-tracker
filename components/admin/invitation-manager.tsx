"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Mail, Check, Clock, XCircle, Trash2 } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  device_id: string | null;
  device_name: string | null;
  created_at: string;
}

export function InvitationManager() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  // Fetch invitations
  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load invitations",
      });
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !profile) return;

    setLoading(true);

    try {
      // Generate invitation token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      // Insert invitation
      const { error } = await supabase.from("invitations").insert({
        email,
        invited_by: profile.id,
        token,
        expires_at: expiresAt.toISOString(),
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      if (error) throw error;

      // Generate invitation URL
      const inviteUrl = `${window.location.origin}/invite/${token}`;

      toast({
        title: "Invitation sent!",
        description: `Invitation link copied to clipboard`,
      });

      // Copy to clipboard
      await navigator.clipboard.writeText(inviteUrl);

      // Reset form
      setEmail("");
      setName("");

      // Refresh invitations list
      await fetchInvitations();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send invitation",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    try {
      const { error } = await supabase.from("invitations").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Invitation deleted",
        description: "The invitation has been removed",
      });

      await fetchInvitations();
    } catch (error) {
      console.error("Error deleting invitation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete invitation",
      });
    }
  };

  const copyInviteLink = async (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Link copied!",
      description: "Invitation link copied to clipboard",
    });
  };

  const getInvitationStatus = (invitation: Invitation) => {
    if (invitation.used_at) {
      return { status: "used", label: "Used", icon: Check, color: "text-green-600" };
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return { status: "expired", label: "Expired", icon: XCircle, color: "text-red-600" };
    }
    return { status: "pending", label: "Pending", icon: Clock, color: "text-yellow-600" };
  };

  return (
    <div className="space-y-6">
      {/* Send Invitation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send Invitation</CardTitle>
          <CardDescription>Invite someone to join the pushup challenge</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvitation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                This helps you remember who you invited
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Sending invitation...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>Manage all sent invitations</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInvitations ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invitations sent yet</p>
              <p className="text-sm">Send your first invitation above!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invitations.map((invitation) => {
                const { status, label, icon: Icon, color } = getInvitationStatus(invitation);
                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Icon className={`h-4 w-4 ${color}`} />
                      <div className="flex-1">
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {status === "used" && invitation.device_name && (
                            <>Used on {invitation.device_name}</>
                          )}
                          {status === "expired" && (
                            <>Expired {new Date(invitation.expires_at).toLocaleDateString()}</>
                          )}
                          {status === "pending" && (
                            <>Expires {new Date(invitation.expires_at).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                      <span className={`text-sm font-medium ${color}`}>{label}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(invitation.token)}
                        >
                          Copy Link
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInvitation(invitation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
