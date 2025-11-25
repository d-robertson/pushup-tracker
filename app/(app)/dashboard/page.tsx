"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layouts/header";
import { QuickAdd } from "@/components/pushups/quick-add";
import { StatsCards } from "@/components/pushups/stats-cards";
import { Leaderboard } from "@/components/pushups/leaderboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, BarChart3, Trophy } from "lucide-react";

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
      <main className="flex-1 flex flex-col">
        <Tabs defaultValue="add" className="flex-1 flex flex-col">
          {/* Tab Content */}
          <div className="flex-1 overflow-auto pb-20">
            <TabsContent value="add" className="mt-0 h-full">
              <div className="container max-w-2xl py-6">
                <QuickAdd todayCount={todayCount} onPushupsAdded={handlePushupsAdded} />
              </div>
            </TabsContent>

            <TabsContent value="stats" className="mt-0 h-full">
              <div className="container max-w-2xl py-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">Your Stats</h2>
                  <p className="text-muted-foreground">Track your progress over time</p>
                </div>
                <StatsCards stats={stats} loading={loading} />
              </div>
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-0 h-full">
              <div className="container max-w-2xl py-6">
                <Leaderboard />
              </div>
            </TabsContent>
          </div>

          {/* Bottom Tab Navigation */}
          <TabsList className="fixed bottom-0 left-0 right-0 h-16 w-full rounded-none border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 grid grid-cols-3">
            <TabsTrigger
              value="add"
              className="flex-col gap-1 h-full data-[state=active]:bg-primary/10"
            >
              <PlusCircle className="h-5 w-5" />
              <span className="text-xs">Add</span>
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="flex-col gap-1 h-full data-[state=active]:bg-primary/10"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs">Stats</span>
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="flex-col gap-1 h-full data-[state=active]:bg-primary/10"
            >
              <Trophy className="h-5 w-5" />
              <span className="text-xs">Leaders</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </main>
    </div>
  );
}
