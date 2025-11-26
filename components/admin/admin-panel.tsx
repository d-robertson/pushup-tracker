"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, UserPlus, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdminPanel() {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const supabase = createClient();

  useEffect(() => {
    const fetchCounts = async () => {
      // Get pending requests count
      const { data: requests } = await supabase
        .from("access_requests")
        .select("id", { count: "exact" })
        .eq("status", "pending");

      setPendingCount(requests?.length || 0);

      // Get total users count
      const { data: users } = await supabase.from("profiles").select("id", { count: "exact" });

      setTotalUsers(users?.length || 0);
    };

    fetchCounts();
  }, [supabase]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Admin Panel
        </h2>
        <p className="text-muted-foreground mt-2">Manage users and access requests</p>
      </div>

      <div className="grid gap-4">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push("/admin/requests")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                  <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Access Requests</CardTitle>
                  <CardDescription>Review pending user requests</CardDescription>
                </div>
              </div>
              {pendingCount > 0 && <Badge variant="default">{pendingCount} pending</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              View Requests
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push("/admin/users")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">User Management</CardTitle>
                  <CardDescription>View and manage all users</CardDescription>
                </div>
              </div>
              <Badge variant="secondary">{totalUsers} users</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Manage Users
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                <Bell className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>Coming soon...</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
