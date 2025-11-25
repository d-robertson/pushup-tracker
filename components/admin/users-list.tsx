"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { User, Shield, Monitor } from "lucide-react";

interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  device_name: string | null;
  is_admin: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export function UsersList() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, email, display_name, device_name, is_admin, created_at, last_seen_at")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load users",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [supabase, toast]);

  const getDisplayName = (user: UserProfile) => {
    return user.display_name || user.email || user.device_name || "Unknown User";
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return "Never";
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>All users in the challenge</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No users yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    {user.is_admin ? (
                      <Shield className="h-5 w-5 text-primary" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{getDisplayName(user)}</p>
                      {user.is_admin && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {user.device_name && (
                        <>
                          <Monitor className="h-3 w-3" />
                          <span>{user.device_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Last seen: {formatLastSeen(user.last_seen_at)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
