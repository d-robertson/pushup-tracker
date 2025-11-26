import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTodaysPushups as getTodaysPushupsRpc,
  getUserPushupStats,
  getPushupHistory as getPushupHistoryRpc,
  getLeaderboard as getLeaderboardRpc,
  addPushups as addPushupsRpc,
  getLatestProgression,
  getProgressionHistory as getProgressionHistoryRpc,
} from "@/lib/supabase/rpc";

// Query keys for cache management
export const pushupKeys = {
  all: ["pushups"] as const,
  todayCount: (userId: string) => [...pushupKeys.all, "today", userId] as const,
  stats: (userId: string) => [...pushupKeys.all, "stats", userId] as const,
  history: (userId: string, days?: number) => [...pushupKeys.all, "history", userId, days] as const,
  leaderboard: () => [...pushupKeys.all, "leaderboard"] as const,
  progression: (userId: string) => [...pushupKeys.all, "progression", userId] as const,
  progressionHistory: (userId: string, days?: number) =>
    [...pushupKeys.all, "progression-history", userId, days] as const,
};

// Hook to get today's pushup count
export function useTodaysPushups(userId: string | undefined) {
  return useQuery({
    queryKey: pushupKeys.todayCount(userId || ""),
    queryFn: async () => {
      if (!userId) return 0;

      const { data, error } = await getTodaysPushupsRpc(userId);

      if (error) throw error;
      return data || 0;
    },
    enabled: !!userId,
  });
}

// Hook to get user stats
export function useUserStats(userId: string | undefined) {
  return useQuery({
    queryKey: pushupKeys.stats(userId || ""),
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await getUserPushupStats(userId);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// Hook to get pushup history
export function usePushupHistory(userId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: pushupKeys.history(userId || "", days),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await getPushupHistoryRpc(userId, days);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

// Hook to get leaderboard
export function useLeaderboard() {
  return useQuery({
    queryKey: pushupKeys.leaderboard(),
    queryFn: async () => {
      const { data, error } = await getLeaderboardRpc();

      if (error) throw error;
      return data || [];
    },
    // Leaderboard updates less frequently, so cache for longer
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutation to add pushups
export function useAddPushups() {
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
      const { data, error } = await addPushupsRpc(userId, count, notes);

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: pushupKeys.todayCount(variables.userId) });
      queryClient.invalidateQueries({ queryKey: pushupKeys.stats(variables.userId) });
      queryClient.invalidateQueries({ queryKey: pushupKeys.history(variables.userId) });
      queryClient.invalidateQueries({ queryKey: pushupKeys.leaderboard() });
      queryClient.invalidateQueries({ queryKey: pushupKeys.progression(variables.userId) });
    },
  });
}

// Hook to get user's progression data
export function useProgression(userId: string | undefined) {
  return useQuery({
    queryKey: pushupKeys.progression(userId || ""),
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await getLatestProgression(userId);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    // Refetch every 5 minutes to keep progression data fresh
    staleTime: 5 * 60 * 1000,
  });
}

// Hook to get progression history for charts
export function useProgressionHistory(userId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: pushupKeys.progressionHistory(userId || "", days),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await getProgressionHistoryRpc(userId, days);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}
