"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/auth/auth-context";
import { QuickAdd } from "@/components/pushups/quick-add";
import { StatsCards } from "@/components/pushups/stats-cards";
import { Leaderboard } from "@/components/pushups/leaderboard";
import { History } from "@/components/pushups/history";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { useTodaysPushups, useUserStats } from "@/lib/query/pushup-queries";

type TabType = "add" | "stats" | "leaderboard" | "history";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("add");

  // Use React Query hooks for data fetching with automatic caching
  const { data: todayCount = 0 } = useTodaysPushups(profile?.id);
  const { data: stats = null, isLoading: loading } = useUserStats(profile?.id);

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
              <QuickAdd todayCount={todayCount} />
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

          {activeTab === "history" && (
            <div
              className="container max-w-2xl py-6 px-4"
              style={{
                animation: "slideIn 0.3s ease-out",
              }}
            >
              <History />
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
