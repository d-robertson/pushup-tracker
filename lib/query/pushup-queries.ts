import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// Query keys for cache management
export const pushupKeys = {
  all: ["pushups"] as const,
  todayCount: (userId: string) => [...pushupKeys.all, "today", userId] as const,
  stats: (userId: string) => [...pushupKeys.all, "stats", userId] as const,
  history: (userId: string, days?: number) => [...pushupKeys.all, "history", userId, days] as const,
  leaderboard: () => [...pushupKeys.all, "leaderboard"] as const,
};

// Hook to get today's pushup count
export function useTodaysPushups(userId: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: pushupKeys.todayCount(userId || ""),
    queryFn: async () => {
      if (!userId) return 0;

      // @ts-expect-error - RPC function types
      const { data, error } = await supabase.rpc("get_todays_pushups", {
        p_user_id: userId,
      });

      if (error) throw error;
      return (data || 0) as number;
    },
    enabled: !!userId,
  });
}

// Hook to get user stats
export function useUserStats(userId: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: pushupKeys.stats(userId || ""),
    queryFn: async () => {
      if (!userId) return null;

      // @ts-expect-error - RPC function types
      const { data, error } = await supabase.rpc("get_user_pushup_stats", {
        p_user_id: userId,
      });

      if (error) throw error;
      return data as {
        total_pushups: number;
        today_count: number;
        current_streak: number;
        longest_streak: number;
        days_active: number;
        average_per_day: number;
      };
    },
    enabled: !!userId,
  });
}

// Hook to get pushup history
export function usePushupHistory(userId: string | undefined, days: number = 30) {
  const supabase = createClient();

  return useQuery({
    queryKey: pushupKeys.history(userId || "", days),
    queryFn: async () => {
      if (!userId) return [];

      // @ts-expect-error - RPC function types
      const { data, error } = await supabase.rpc("get_pushup_history", {
        p_user_id: userId,
        p_days: days,
      });

      if (error) throw error;
      return (data || []) as Array<{
        entry_date: string;
        count: number;
        notes: string | null;
        created_at: string;
        updated_at: string;
      }>;
    },
    enabled: !!userId,
  });
}

// Hook to get leaderboard
export function useLeaderboard() {
  const supabase = createClient();

  return useQuery({
    queryKey: pushupKeys.leaderboard(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard");

      if (error) throw error;
      return (data || []) as Array<{
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
      }>;
    },
    // Leaderboard updates less frequently, so cache for longer
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutation to add pushups
export function useAddPushups() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      count,
      notes,
    }: {
      userId: string;
      count: number;
      notes?: string;
    }) => {
      // @ts-expect-error - RPC function types
      const { data, error } = await supabase.rpc("add_pushups", {
        p_user_id: userId,
        p_count: count,
        p_notes: notes || null,
      });

      if (error) throw error;
      return data as {
        entry_id: string;
        entry_date: string;
        total_count: number;
        added_count: number;
      };
    },
    onSuccess: (_data, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: pushupKeys.todayCount(variables.userId) });
      queryClient.invalidateQueries({ queryKey: pushupKeys.stats(variables.userId) });
      queryClient.invalidateQueries({ queryKey: pushupKeys.history(variables.userId) });
      queryClient.invalidateQueries({ queryKey: pushupKeys.leaderboard() });
    },
  });
}
