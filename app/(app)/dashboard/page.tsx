"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { QuickAdd } from "@/components/pushups/quick-add";
import { StatsCards } from "@/components/pushups/stats-cards";
import { Leaderboard } from "@/components/pushups/leaderboard";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { useToast } from "@/components/ui/use-toast";

type TabType = "add" | "stats" | "leaderboard";

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

  const [activeTab, setActiveTab] = useState<TabType>("add");
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
    <div>
      <div
        style={{
          height: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "hsl(var(--background))",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "calc(100vh - 116px)",
            overflowX: "hidden",
            overflowY: "auto",
          }}
        >
          {activeTab === "add" && (
            <div
              className="container max-w-2xl py-6 px-4"
              style={{
                animation: "slideIn 0.3s ease-out",
              }}
            >
              <QuickAdd todayCount={todayCount} onPushupsAdded={handlePushupsAdded} />
            </div>
          )}

          {activeTab === "stats" && (
            <div
              className="container max-w-2xl py-6 px-4"
              style={{
                animation: "slideIn 0.3s ease-out",
              }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Your Stats</h2>
                <p className="text-muted-foreground">Track your progress over time</p>
              </div>
              <StatsCards stats={stats} loading={loading} />
            </div>
          )}

          {activeTab === "leaderboard" && (
            <div
              className="container max-w-2xl py-6 px-4"
              style={{
                animation: "slideIn 0.3s ease-out",
              }}
            >
              <Leaderboard />
            </div>
          )}
        </div>

        <div style={{ height: "116px", flexShrink: 0 }}>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
