"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Plus, TrendingUp } from "lucide-react";

interface QuickAddProps {
  todayCount: number;
  onPushupsAdded: () => void;
}

export function QuickAdd({ todayCount, onPushupsAdded }: QuickAddProps) {
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const addPushups = async (count: number) => {
    if (!profile || count <= 0) return;

    setLoading(true);

    try {
      // @ts-expect-error - RPC function types
      const { data, error } = await supabase.rpc("add_pushups", {
        p_user_id: profile.id,
        p_count: count,
      });

      if (error) throw error;

      // @ts-expect-error - RPC return type
      const newTotal = data.total_count;
      const dailyGoal = 100;
      const remaining = Math.max(0, dailyGoal - newTotal);

      toast({
        title: `+${count} pushups! 💪`,
        description:
          remaining > 0
            ? `${remaining} more to reach your daily goal!`
            : `Daily goal complete! You're at ${newTotal} today!`,
      });

      setCustomAmount("");
      onPushupsAdded();
    } catch (error) {
      console.error("Error adding pushups:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add pushups. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = (amount: number) => {
    addPushups(amount);
  };

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(customAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a valid number of pushups",
      });
      return;
    }
    addPushups(amount);
  };

  const dailyGoal = 100;
  const progress = Math.min(100, (todayCount / dailyGoal) * 100);
  const isGoalMet = todayCount >= dailyGoal;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Add Pushups</span>
          <TrendingUp className="h-5 w-5 text-primary" />
        </CardTitle>
        <CardDescription>Track your sets throughout the day</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Today's Total */}
        <div className="text-center space-y-2">
          <div className="flex items-baseline justify-center gap-2">
            <span className={`text-6xl font-bold ${isGoalMet ? "text-green-600" : "text-primary"}`}>
              {todayCount}
            </span>
            <span className="text-2xl text-muted-foreground">/ {dailyGoal}</span>
          </div>
          <p className="text-sm text-muted-foreground">pushups today</p>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isGoalMet ? "bg-green-600" : "bg-primary"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {isGoalMet && (
            <p className="text-sm font-medium text-green-600 animate-pulse">
              🎉 Daily goal complete!
            </p>
          )}
        </div>

        {/* Quick Add Buttons */}
        <div>
          <p className="text-sm font-medium mb-2">Quick Add</p>
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 20, 50].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="lg"
                onClick={() => handleQuickAdd(amount)}
                disabled={loading}
                className="h-16 text-lg font-semibold"
              >
                +{amount}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div>
          <p className="text-sm font-medium mb-2">Custom Amount</p>
          <form onSubmit={handleCustomAdd} className="flex gap-2">
            <Input
              type="number"
              min="1"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              disabled={loading}
              className="text-lg"
            />
            <Button type="submit" disabled={loading || !customAmount} size="lg">
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-1" />
                  Add
                </>
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
