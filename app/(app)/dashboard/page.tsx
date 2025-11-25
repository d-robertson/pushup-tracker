"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
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
    <div className="h-screen w-full flex flex-col bg-background">
      <Tabs defaultValue="add" className="h-full w-full flex flex-col">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <TabsContent value="add" className="h-full m-0 p-0">
            <div className="container max-w-2xl py-6 px-4 pb-24">
              <QuickAdd todayCount={todayCount} onPushupsAdded={handlePushupsAdded} />
            </div>
          </TabsContent>

          <TabsContent value="stats" className="h-full m-0 p-0">
            <div className="container max-w-2xl py-6 px-4 pb-24">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Your Stats</h2>
                <p className="text-muted-foreground">Track your progress over time</p>
              </div>
              <StatsCards stats={stats} loading={loading} />
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="h-full m-0 p-0">
            <div className="container max-w-2xl py-6 px-4 pb-24">
              <Leaderboard />
            </div>
          </TabsContent>
        </div>

        {/* Bottom Navigation Bar - Fixed */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white dark:bg-gray-950 shadow-lg">
          <TabsList className="w-full h-20 flex flex-row items-stretch justify-evenly bg-transparent p-0 m-0 rounded-none border-0">
            <TabsTrigger
              value="add"
              className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-none border-0 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-colors"
            >
              <PlusCircle className="h-6 w-6" />
              <span className="text-xs font-medium">Add</span>
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-none border-0 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-colors"
            >
              <BarChart3 className="h-6 w-6" />
              <span className="text-xs font-medium">Stats</span>
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-none border-0 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-colors"
            >
              <Trophy className="h-6 w-6" />
              <span className="text-xs font-medium">Leaders</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
}
