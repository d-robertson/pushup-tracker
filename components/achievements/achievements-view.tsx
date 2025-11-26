"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useAchievements, useAchievementStats } from "@/lib/query/achievement-queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Lock, CheckCircle } from "lucide-react";

export function AchievementsView() {
  const { profile } = useAuth();
  const { data: achievements, isLoading } = useAchievements(profile?.id);
  const stats = useAchievementStats(profile?.id);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      milestone: "Milestone Badges",
      streak: "Streak Badges",
      daily: "Daily Achievements",
      consistency: "Consistency Badges",
      recovery: "Recovery Badges",
      special: "Special Badges",
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      milestone: "bg-blue-100 dark:bg-blue-950",
      streak: "bg-orange-100 dark:bg-orange-950",
      daily: "bg-purple-100 dark:bg-purple-950",
      consistency: "bg-green-100 dark:bg-green-950",
      recovery: "bg-yellow-100 dark:bg-yellow-950",
      special: "bg-pink-100 dark:bg-pink-950",
    };
    return colors[category] || "bg-gray-100 dark:bg-gray-950";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const achievementsByCategory = achievements?.reduce(
    (acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category]!.push(achievement);
      return acc;
    },
    {} as Record<string, typeof achievements>
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Unlocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.earned} / {stats.total}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.percentage}% complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Object.keys(stats.byCategory).length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Object.keys(stats.byCategory).length} badge types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4">
              <div
                className="bg-primary h-4 rounded-full transition-all"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Keep pushing to unlock more!</p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements by Category */}
      {achievementsByCategory &&
        Object.entries(achievementsByCategory).map(([category, categoryAchievements]) => (
          <div key={category}>
            <h2 className="text-xl font-bold mb-4">{getCategoryLabel(category)}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {categoryAchievements.map((achievement) => (
                <Card
                  key={achievement.achievement_id}
                  className={achievement.earned ? "" : "opacity-60"}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={`p-4 rounded-full ${getCategoryColor(category)} flex items-center justify-center text-3xl`}
                      >
                        {achievement.earned ? (
                          achievement.icon
                        ) : (
                          <Lock className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{achievement.name}</h3>
                          {achievement.earned && (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {achievement.description}
                        </p>
                        {achievement.earned && achievement.earned_at && (
                          <p className="text-xs text-muted-foreground">
                            Unlocked {new Date(achievement.earned_at).toLocaleDateString()}
                          </p>
                        )}
                        {!achievement.earned && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
