"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { deleteUser } from "@/lib/supabase/rpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layouts/header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import { Users, Shield, User, Calendar, Smartphone, Pencil, Trash2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  device_id: string;
  device_name: string;
  display_name: string | null;
  email: string | null;
  is_admin: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { authenticated, isAdmin, loading: authLoading, profile: currentUserProfile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!authenticated || !isAdmin)) {
      router.push("/");
    }
  }, [authenticated, isAdmin, authLoading, router]);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error("Error in fetchUsers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated && isAdmin) {
      fetchUsers();
    }
  }, [authenticated, isAdmin]);

  const handleStartEdit = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditingName(user.display_name || user.device_name || "");
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingName("");
  };

  const handleSaveEdit = async (userId: string) => {
    if (!editingName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Name cannot be empty",
      });
      return;
    }

    setProcessingIds((prev) => new Set(prev).add(userId));

    try {
      const { error } = await supabase
        .from("profiles")
        // @ts-expect-error - Supabase type inference issue
        .update({ display_name: editingName.trim() })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "User name updated successfully",
      });

      setEditingUserId(null);
      setEditingName("");
      await fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user name",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    // Prevent deleting yourself
    if (user.id === currentUserProfile?.id) {
      toast({
        variant: "destructive",
        title: "Cannot Delete",
        description: "You cannot delete your own account",
      });
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${user.display_name || user.device_name}? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    setProcessingIds((prev) => new Set(prev).add(user.id));

    try {
      const { data, error } = await deleteUser(user.id);

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "User Deleted",
          description: `${user.display_name || user.device_name} has been removed`,
        });
        await fetchUsers();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data?.message || "Failed to delete user",
        });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete user",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
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
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground mt-2">View and manage all users in the system</p>
            </div>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.filter((u) => u.is_admin).length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.filter((u) => !u.is_admin).length}</div>
              </CardContent>
            </Card>
          </div>

          {users.length === 0 ? (
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-muted">
                    <Users className="h-12 w-12 text-muted-foreground" />
                  </div>
                </div>
                <CardTitle>No Users</CardTitle>
                <CardDescription>No users have been created yet</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <Card key={user.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            {user.is_admin ? (
                              <Shield className="h-5 w-5 text-primary" />
                            ) : (
                              <User className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1">
                            {editingUserId === user.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="max-w-xs"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSaveEdit(user.id)}
                                  disabled={processingIds.has(user.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  disabled={processingIds.has(user.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold">
                                  {user.display_name || user.device_name || "Unknown User"}
                                </h3>
                                {user.is_admin && <Badge variant="default">Admin</Badge>}
                              </div>
                            )}
                            {user.email && (
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="bg-muted p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Smartphone className="h-4 w-4 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Device</p>
                            </div>
                            <p className="text-sm">{user.device_name || "Unknown Device"}</p>
                          </div>

                          <div className="bg-muted p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Joined</p>
                            </div>
                            <p className="text-sm">
                              {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Device ID</p>
                          <p className="text-xs font-mono break-all">{user.device_id}</p>
                        </div>

                        {user.last_seen_at && (
                          <p className="text-xs text-muted-foreground">
                            Last seen: {new Date(user.last_seen_at).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(user)}
                          disabled={editingUserId !== null || processingIds.has(user.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(user)}
                          disabled={
                            user.id === currentUserProfile?.id ||
                            editingUserId !== null ||
                            processingIds.has(user.id)
                          }
                        >
                          {processingIds.has(user.id) ? (
                            <Spinner size="sm" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
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
