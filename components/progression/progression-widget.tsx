"use client";

import { useProgression } from "@/lib/query/progression-queries";
import {
  getProgressionExplanation,
  getMotivationalMessage,
} from "@/lib/progression/progression-calculator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Target, TrendingUp, TrendingDown, Minus, Flame } from "lucide-react";

interface ProgressionWidgetProps {
  userId: string;
}

export function ProgressionWidget({ userId }: ProgressionWidgetProps) {
  const { data: progression, isLoading } = useProgression(userId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (!progression) {
    return null;
  }

  const getModeIcon = () => {
    switch (progression.mode) {
      case "ahead":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "catch-up":
        return <TrendingDown className="h-5 w-5 text-orange-500" />;
      default:
        return <Minus className="h-5 w-5 text-blue-500" />;
    }
  };

  const getModeColor = () => {
    switch (progression.mode) {
      case "ahead":
        return "default";
      case "catch-up":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getModeLabel = () => {
    switch (progression.mode) {
      case "ahead":
        return "Ahead of Schedule";
      case "catch-up":
        return "Catch-Up Mode";
      default:
        return "On Track";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Daily Target</CardTitle>
          </div>
          <Badge variant={getModeColor()} className="flex items-center gap-1">
            {getModeIcon()}
            {getModeLabel()}
          </Badge>
        </div>
        <CardDescription>{getProgressionExplanation(progression)}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Daily Target Display */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10">
            <span className="text-sm font-medium">Today's Target</span>
            <span className="text-3xl font-bold text-primary">{progression.dailyTarget}</span>
          </div>

          {/* Streak Display */}
          {progression.currentStreak > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-sm font-medium">Current Streak</span>
              </div>
              <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {progression.currentStreak} days
              </span>
            </div>
          )}

          {/* Motivational Message */}
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium">
              {getMotivationalMessage(progression, progression.currentStreak)}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Weekly Target</p>
              <p className="text-lg font-bold">{progression.weeklyTarget}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Days Remaining</p>
              <p className="text-lg font-bold">{progression.daysRemaining}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Total Progress</p>
              <p className="text-lg font-bold">{progression.totalPushups?.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">
                {progression.deficit >= 0 ? "Ahead by" : "Behind by"}
              </p>
              <p
                className={`text-lg font-bold ${progression.deficit >= 0 ? "text-green-600" : "text-orange-600"}`}
              >
                {Math.abs(progression.deficit)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
