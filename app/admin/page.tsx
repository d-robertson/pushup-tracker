"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Header } from "@/components/layouts/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvitationManager } from "@/components/admin/invitation-manager";
import { UsersList } from "@/components/admin/users-list";
import { Shield } from "lucide-react";

export default function AdminPage() {
  const { isAdmin, loading, authenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!authenticated || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [isAdmin, loading, authenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
              <p className="text-muted-foreground">Manage users and invitations</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="invitations" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="invitations">Invitations</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            <TabsContent value="invitations" className="space-y-4">
              <InvitationManager />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <UsersList />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
