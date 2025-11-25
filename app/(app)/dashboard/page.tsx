"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layouts/header";
import { QuickAdd } from "@/components/pushups/quick-add";
import { StatsCards } from "@/components/pushups/stats-cards";
import { Leaderboard } from "@/components/pushups/leaderboard";
import { useToast } from "@/components/ui/use-toast";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [todayCount, setTodayCount] = useState(0);
  const [stats, setStats] = useState<{
    total_pushups: number;
    today_count: number;
    current_streak: number;
    longest_streak: number;
    days_active: number;
    average_per_day: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const displayName = profile?.display_name || profile?.email || profile?.device_name || "User";

  const fetchData = async () => {
    if (!profile) return;

    try {
      // Fetch today's count
      // @ts-expect-error - RPC function types
      const { data: todayData, error: todayError } = await supabase.rpc("get_todays_pushups", {
        p_user_id: profile.id,
      });

      if (todayError) throw todayError;
      setTodayCount(todayData || 0);

      // Fetch stats
      // @ts-expect-error - RPC function types
      const { data: statsData, error: statsError } = await supabase.rpc("get_user_pushup_stats", {
        p_user_id: profile.id,
      });

      if (statsError) throw statsError;
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching pushup data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load pushup data",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const handlePushupsAdded = () => {
    // Refresh data after adding pushups
    fetchData();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">Welcome back, {displayName}!</p>
          </div>

          {/* Stats Cards */}
          <StatsCards stats={stats} loading={loading} />

          {/* Quick Add and Leaderboard */}
          <div className="grid gap-6 lg:grid-cols-2">
            <QuickAdd todayCount={todayCount} onPushupsAdded={handlePushupsAdded} />
            <Leaderboard />
          </div>
        </div>
      </main>
    </div>
  );
}
