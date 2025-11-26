"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Trophy, Flame, TrendingUp, Target, Crown } from "lucide-react";
import { useLeaderboard } from "@/lib/query/pushup-queries";

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  email: string | null;
  device_name: string | null;
  total_pushups: number;
  current_streak: number;
  today_pushups: number;
  week_pushups: number;
  month_pushups: number;
  days_active: number;
}

type LeaderboardView = "total" | "week" | "today" | "streak";

export function Leaderboard() {
  const [view, setView] = useState<LeaderboardView>("total");
  const { profile } = useAuth();

  // Use React Query hook for automatic caching and refetching
  const { data: leaderboardData = [], isLoading: loading } = useLeaderboard();

  const getDisplayName = (entry: LeaderboardEntry) => {
    return entry.display_name || entry.email || entry.device_name || "Unknown User";
  };

  const getSortedData = () => {
    const sorted = [...leaderboardData];
    switch (view) {
      case "total":
        return sorted.sort((a, b) => b.total_pushups - a.total_pushups);
      case "week":
        return sorted.sort((a, b) => b.week_pushups - a.week_pushups);
      case "today":
        return sorted.sort((a, b) => b.today_pushups - a.today_pushups);
      case "streak":
        return sorted.sort((a, b) => b.current_streak - a.current_streak);
      default:
        return sorted;
    }
  };

  const getValue = (entry: LeaderboardEntry) => {
    switch (view) {
      case "total":
        return entry.total_pushups.toLocaleString();
      case "week":
        return entry.week_pushups.toLocaleString();
      case "today":
        return entry.today_pushups.toLocaleString();
      case "streak":
        return `${entry.current_streak} ${entry.current_streak === 1 ? "day" : "days"}`;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Trophy className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
    }
  };

  const sortedData = getSortedData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Leaderboard
        </CardTitle>
        <CardDescription>See how you stack up against the competition</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={view} onValueChange={(v) => setView(v as LeaderboardView)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="total" className="text-xs">
              <Trophy className="h-3 w-3 mr-1" />
              All Time
            </TabsTrigger>
            <TabsTrigger value="week" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              This Week
            </TabsTrigger>
            <TabsTrigger value="today" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              Today
            </TabsTrigger>
            <TabsTrigger value="streak" className="text-xs">
              <Flame className="h-3 w-3 mr-1" />
              Streak
            </TabsTrigger>
          </TabsList>

          <TabsContent value={view} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : sortedData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No data yet</p>
                <p className="text-sm">Start doing pushups to see the leaderboard!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedData.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser = entry.user_id === profile?.id;
                  const value = getValue(entry);

                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isCurrentUser ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                      }`}
                    >
                      {/* Rank */}
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(rank)}
                      </div>

                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium truncate ${isCurrentUser ? "text-primary" : ""}`}
                        >
                          {getDisplayName(entry)}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-primary">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.days_active} {entry.days_active === 1 ? "day" : "days"} active
                        </p>
                      </div>

                      {/* Value */}
                      <div className="text-right">
                        <p className="text-lg font-bold">{value}</p>
                        {view === "total" && entry.total_pushups > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {Math.round(entry.total_pushups / entry.days_active)}/day avg
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
