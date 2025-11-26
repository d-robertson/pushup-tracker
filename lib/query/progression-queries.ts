import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  calculateProgression,
  calculateStreak,
  type UserProgress,
} from "../progression/progression-calculator";

const supabase = createClient();

/**
 * Hook to get the latest progression data for a user
 */
export function useProgression(userId: string | undefined) {
  return useQuery({
    queryKey: ["progression", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      // Get user's pushup history
      // @ts-expect-error - Supabase types
      const { data: entries, error: entriesError } = await supabase
        .from("pushup_entries")
        .select("entry_date, count")
        .eq("user_id", userId)
        .order("entry_date", { ascending: true });

      if (entriesError) throw entriesError;

      // Calculate total pushups
      // @ts-expect-error - entries typing
      const totalPushups =
        (entries as unknown as Array<{ count: number }>)?.reduce((sum, e) => sum + e.count, 0) || 0;

      // Format for progression calculator
      // @ts-expect-error - entries typing
      const formattedEntries =
        (entries as unknown as Array<{ entry_date: string; count: number }>)?.map((e) => ({
          date: e.entry_date,
          count: e.count,
        })) || [];

      const userProgress: UserProgress = {
        totalPushups,
        entries: formattedEntries,
      };

      // Calculate progression
      const progression = calculateProgression(userProgress);

      // Calculate streak
      const streak = calculateStreak(userProgress.entries);

      return {
        ...progression,
        ...streak,
        totalPushups,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get progression history (snapshots over time)
 */
export function useProgressionHistory(userId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ["progression-history", userId, days],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      // @ts-expect-error - RPC function types
      const { data, error } = await supabase.rpc("get_progression_history", {
        p_user_id: userId,
        p_days: days,
      });

      if (error) throw error;

      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create or update a progression snapshot
 */
export function useCreateProgressionSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, date }: { userId: string; date: string }) => {
      // @ts-expect-error - RPC function types
      const { data, error } = await supabase.rpc("create_progression_snapshot", {
        p_user_id: userId,
        p_snapshot_date: date,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["progression", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["progression-history", variables.userId] });
    },
  });
}
