import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { checkAchievements, type AchievementToUnlock } from "../achievements/achievement-checker";

const supabase = createClient();

export interface Achievement {
  achievement_id: string;
  category: string;
  name: string;
  description: string;
  icon: string;
  requirement_value: number | null;
  earned: boolean;
  earned_at: string | null;
}

/**
 * Hook to get all achievements with user's progress
 */
export function useAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ["achievements", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      // @ts-expect-error - RPC function types
      const { data, error } = await supabase.rpc("get_achievements_with_progress", {
        p_user_id: userId,
      });

      if (error) throw error;

      return (data || []) as Achievement[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get user's earned achievements only
 */
export function useEarnedAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ["earned-achievements", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      // @ts-expect-error - RPC function types
      const { data, error } = await supabase.rpc("get_user_achievements", {
        p_user_id: userId,
      });

      if (error) throw error;

      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to check and unlock achievements
 */
export function useCheckAchievements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<AchievementToUnlock[]> => {
      return await checkAchievements(userId);
    },
    onSuccess: (_, userId) => {
      // Invalidate achievement queries to refetch
      queryClient.invalidateQueries({ queryKey: ["achievements", userId] });
      queryClient.invalidateQueries({ queryKey: ["earned-achievements", userId] });
    },
  });
}

/**
 * Get achievement stats
 */
export function useAchievementStats(userId: string | undefined) {
  const { data: achievements } = useAchievements(userId);

  if (!achievements) {
    return {
      total: 0,
      earned: 0,
      percentage: 0,
      byCategory: {},
    };
  }

  const earned = achievements.filter((a) => a.earned).length;
  const total = achievements.length;
  const percentage = total > 0 ? Math.round((earned / total) * 100) : 0;

  // Group by category
  const byCategory = achievements.reduce(
    (acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = { total: 0, earned: 0 };
      }
      acc[achievement.category]!.total++;
      if (achievement.earned) {
        acc[achievement.category]!.earned++;
      }
      return acc;
    },
    {} as Record<string, { total: number; earned: number }>
  );

  return {
    total,
    earned,
    percentage,
    byCategory,
  };
}
