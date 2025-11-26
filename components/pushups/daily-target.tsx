"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Target, TrendingUp, TrendingDown, Info, Zap, Trophy, AlertCircle } from "lucide-react";
import { useProgression } from "@/lib/query/pushup-queries";

interface DailyTargetProps {
  todayCount: number;
}

export function DailyTarget({ todayCount }: DailyTargetProps) {
  const { profile } = useAuth();
  const { data: progression, isLoading } = useProgression(profile?.id);
  const [showExplanation, setShowExplanation] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (!progression) {
    return null;
  }

  const { daily_target, mode, deficit, seven_day_average } = progression;
  const remaining = Math.max(0, daily_target - todayCount);
  const percentComplete = daily_target > 0 ? (todayCount / daily_target) * 100 : 0;
  const isComplete = todayCount >= daily_target;

  // Mode-specific styling and messaging
  const getModeConfig = () => {
    switch (mode) {
      case "ahead":
        return {
          icon: Trophy,
          color: "text-green-600",
          bgColor: "bg-green-100 dark:bg-green-900/20",
          borderColor: "border-green-200 dark:border-green-800",
          barColor: "bg-green-600",
          title: "You're Ahead!",
          subtitle: `${Math.abs(deficit)} pushups ahead of schedule`,
        };
      case "standard":
        return {
          icon: Target,
          color: "text-blue-600",
          bgColor: "bg-blue-100 dark:bg-blue-900/20",
          borderColor: "border-blue-200 dark:border-blue-800",
          barColor: "bg-blue-600",
          title: "On Track",
          subtitle: "Maintaining steady progress",
        };
      case "catchup":
        return {
          icon: Zap,
          color: "text-orange-600",
          bgColor: "bg-orange-100 dark:bg-orange-900/20",
          borderColor: "border-orange-200 dark:border-orange-800",
          barColor: "bg-orange-600",
          title: "Catch-Up Mode",
          subtitle: `${deficit} pushups behind - adjusted target active`,
        };
      default:
        return {
          icon: Target,
          color: "text-gray-600",
          bgColor: "bg-gray-100 dark:bg-gray-900/20",
          borderColor: "border-gray-200 dark:border-gray-800",
          barColor: "bg-gray-600",
          title: "Daily Target",
          subtitle: "Keep going!",
        };
    }
  };

  const config = getModeConfig();
  const Icon = config.icon;

  return (
    <>
      <Card className={`border-2 ${config.borderColor}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${config.bgColor}`}>
                <Icon className={`h-6 w-6 ${config.color}`} />
              </div>
              <div>
                <CardTitle className="text-lg">{config.title}</CardTitle>
                <CardDescription className="text-xs">{config.subtitle}</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExplanation(!showExplanation)}
              className="h-8 w-8 p-0"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Daily Target Progress */}
          <div className="text-center space-y-2">
            <div className="flex items-baseline justify-center gap-2">
              <span
                className={`text-5xl font-bold ${isComplete ? "text-green-600" : config.color}`}
              >
                {todayCount}
              </span>
              <span className="text-3xl text-muted-foreground">/ {daily_target}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {isComplete
                ? "Daily target complete! 🎉"
                : `${remaining} more to reach today's target`}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isComplete ? "bg-green-600" : config.barColor
                }`}
                style={{ width: `${Math.min(100, percentComplete)}%` }}
              />
            </div>
          </div>

          {/* Explanation Section */}
          {showExplanation && (
            <div
              className={`p-4 rounded-lg ${config.bgColor} border ${config.borderColor} space-y-3`}
            >
              <h4 className="font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" />
                How Your Target Works
              </h4>

              {mode === "standard" && (
                <div className="text-sm space-y-2">
                  <p>
                    You're on track! Keep doing <strong>100 pushups per day</strong> to reach 36,500
                    by the end of 2026.
                  </p>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Your 7-day average: {Math.round(seven_day_average)} pushups/day</span>
                  </div>
                </div>
              )}

              {mode === "ahead" && (
                <div className="text-sm space-y-2">
                  <p>
                    Amazing work! You're <strong>{Math.abs(deficit)} pushups ahead</strong> of
                    schedule. Keep up the momentum!
                  </p>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Trophy className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Your 7-day average: {Math.round(seven_day_average)} pushups/day</span>
                  </div>
                </div>
              )}

              {mode === "catchup" && (
                <div className="text-sm space-y-2">
                  <p>
                    You're <strong>{deficit} pushups behind</strong>, so your target is adjusted to{" "}
                    <strong>{daily_target}/day</strong>.
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        This target increases gradually based on your 7-day average (
                        {Math.round(seven_day_average)}/day)
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Daily targets are capped at 200 to prevent injury</span>
                    </div>
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <Zap className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Hit your adjusted targets consistently and you'll catch up in no time!
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {daily_target > 100 && mode === "catchup" && (
                <div className="pt-2 border-t border-current/20">
                  <p className="text-xs text-muted-foreground">
                    💡 Tip: Break your target into smaller sets throughout the day. Even 10-20 at a
                    time adds up!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">7-Day Avg</p>
              <p className="text-lg font-bold">{Math.round(seven_day_average)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Position</p>
              <div className="flex items-center justify-center gap-1">
                {deficit <= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                )}
                <p className="text-lg font-bold">
                  {deficit <= 0 ? `+${Math.abs(deficit)}` : `-${deficit}`}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
