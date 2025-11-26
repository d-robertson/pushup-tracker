/**
 * Achievement Checker
 * Checks user progress and determines which achievements should be unlocked
 */

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface AchievementToUnlock {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

/**
 * Check all achievements for a user and return newly unlocked ones
 */
export async function checkAchievements(userId: string): Promise<AchievementToUnlock[]> {
  const newlyUnlocked: AchievementToUnlock[] = [];

  // Get user's stats and history
  // @ts-expect-error - Supabase types
  const { data: entries } = await supabase
    .from("pushup_entries")
    .select("entry_date, count, created_at")
    .eq("user_id", userId)
    .order("entry_date", { ascending: true });

  if (!entries || entries.length === 0) return [];

  // @ts-expect-error - entries typing
  const totalPushups = entries.reduce((sum, e) => sum + e.count, 0);

  // Check milestone achievements
  const milestoneChecks = await checkMilestones(userId, totalPushups);
  newlyUnlocked.push(...milestoneChecks);

  // Check streak achievements
  const streakChecks = await checkStreaks(userId, entries);
  newlyUnlocked.push(...streakChecks);

  // Check daily achievements
  const dailyChecks = await checkDailyAchievements(userId, entries);
  newlyUnlocked.push(...dailyChecks);

  // Check consistency achievements
  const consistencyChecks = await checkConsistency(userId, entries);
  newlyUnlocked.push(...consistencyChecks);

  // Check recovery achievements
  const recoveryChecks = await checkRecovery(userId, entries);
  newlyUnlocked.push(...recoveryChecks);

  // Check special achievements
  const specialChecks = await checkSpecial(userId, entries);
  newlyUnlocked.push(...specialChecks);

  return newlyUnlocked;
}

/**
 * Check milestone achievements (total pushups)
 */
async function checkMilestones(
  userId: string,
  totalPushups: number
): Promise<AchievementToUnlock[]> {
  const milestones = [
    { id: "milestone_100", value: 100, name: "First Step", icon: "🏁" },
    { id: "milestone_1000", value: 1000, name: "Thousand Club", icon: "🎯" },
    { id: "milestone_5000", value: 5000, name: "Five Grand", icon: "💪" },
    { id: "milestone_10000", value: 10000, name: "Ten Thousand Strong", icon: "🔥" },
    { id: "milestone_20000", value: 20000, name: "Twenty K Champion", icon: "🏆" },
    { id: "milestone_36500", value: 36500, name: "Goal Complete", icon: "💎" },
  ];

  const unlocked: AchievementToUnlock[] = [];

  for (const milestone of milestones) {
    if (totalPushups >= milestone.value) {
      const awarded = await awardIfNew(userId, milestone.id);
      if (awarded) {
        unlocked.push({
          id: milestone.id,
          name: milestone.name,
          description: `Complete ${milestone.value.toLocaleString()} total pushups`,
          icon: milestone.icon,
          category: "milestone",
        });
      }
    }
  }

  return unlocked;
}

/**
 * Check streak achievements
 */
async function checkStreaks(
  userId: string,
  entries: Array<{ entry_date: string; count: number }>
): Promise<AchievementToUnlock[]> {
  const currentStreak = calculateCurrentStreak(entries);

  const streaks = [
    { id: "streak_3", value: 3, name: "Three Days Strong", icon: "🌟" },
    { id: "streak_7", value: 7, name: "Week Warrior", icon: "⭐" },
    { id: "streak_14", value: 14, name: "Two Week Titan", icon: "🌠" },
    { id: "streak_30", value: 30, name: "Month Master", icon: "🔆" },
    { id: "streak_50", value: 50, name: "Unbreakable", icon: "☀️" },
    { id: "streak_100", value: 100, name: "Century Streak", icon: "🌞" },
    { id: "streak_365", value: 365, name: "Year-Long Legend", icon: "🏅" },
  ];

  const unlocked: AchievementToUnlock[] = [];

  for (const streak of streaks) {
    if (currentStreak >= streak.value) {
      const awarded = await awardIfNew(userId, streak.id);
      if (awarded) {
        unlocked.push({
          id: streak.id,
          name: streak.name,
          description: `Log pushups ${streak.value} days in a row`,
          icon: streak.icon,
          category: "streak",
        });
      }
    }
  }

  return unlocked;
}

/**
 * Check daily achievements
 */
async function checkDailyAchievements(
  userId: string,
  entries: Array<{ entry_date: string; count: number }>
): Promise<AchievementToUnlock[]> {
  const unlocked: AchievementToUnlock[] = [];

  // Check single day records
  const maxSingleDay = Math.max(...entries.map((e) => e.count));

  if (maxSingleDay >= 100) {
    const awarded = await awardIfNew(userId, "daily_100");
    if (awarded) {
      unlocked.push({
        id: "daily_100",
        name: "Century Club",
        description: "Complete 100+ pushups in one day",
        icon: "✨",
        category: "daily",
      });
    }
  }

  if (maxSingleDay >= 150) {
    const awarded = await awardIfNew(userId, "daily_150");
    if (awarded) {
      unlocked.push({
        id: "daily_150",
        name: "Overachiever",
        description: "Complete 150+ pushups in one day",
        icon: "💥",
        category: "daily",
      });
    }
  }

  if (maxSingleDay >= 200) {
    const awarded = await awardIfNew(userId, "daily_200");
    if (awarded) {
      unlocked.push({
        id: "daily_200",
        name: "Beast Mode",
        description: "Complete 200+ pushups in one day",
        icon: "🚀",
        category: "daily",
      });
    }
  }

  // Check perfect week (7 days of 100+)
  if (hasPerfectWeek(entries)) {
    const awarded = await awardIfNew(userId, "perfect_week");
    if (awarded) {
      unlocked.push({
        id: "perfect_week",
        name: "Superhuman",
        description: "Complete 100+ pushups every day for 7 days",
        icon: "🦾",
        category: "daily",
      });
    }
  }

  // Check perfect month (30 days of 100+)
  if (hasPerfectMonth(entries)) {
    const awarded = await awardIfNew(userId, "perfect_month");
    if (awarded) {
      unlocked.push({
        id: "perfect_month",
        name: "Perfect Month",
        description: "Complete 100+ pushups every day for 30 days",
        icon: "🎖️",
        category: "daily",
      });
    }
  }

  return unlocked;
}

/**
 * Check consistency achievements
 */
async function checkConsistency(
  _userId: string,
  _entries: Array<{ entry_date: string; count: number }>
): Promise<AchievementToUnlock[]> {
  const unlocked: AchievementToUnlock[] = [];

  // These are more complex - simplified for now
  // TODO: Implement Monday streak, weekend streak, etc.

  return unlocked;
}

/**
 * Check recovery achievements
 */
async function checkRecovery(
  _userId: string,
  _entries: Array<{ entry_date: string; count: number }>
): Promise<AchievementToUnlock[]> {
  const unlocked: AchievementToUnlock[] = [];

  // TODO: Implement recovery detection logic

  return unlocked;
}

/**
 * Check special achievements
 */
async function checkSpecial(
  userId: string,
  entries: Array<{ entry_date: string; count: number; created_at: string }>
): Promise<AchievementToUnlock[]> {
  const unlocked: AchievementToUnlock[] = [];

  // Check New Year's Hero (logged on Jan 1, 2026)
  const hasNewYearEntry = entries.some((e) => e.entry_date === "2026-01-01");
  if (hasNewYearEntry) {
    const awarded = await awardIfNew(userId, "special_newyear");
    if (awarded) {
      unlocked.push({
        id: "special_newyear",
        name: "New Year's Hero",
        description: "Log pushups on January 1, 2026",
        icon: "🎆",
        category: "special",
      });
    }
  }

  // Check halfway point
  const totalPushups = entries.reduce((sum, e) => sum + e.count, 0);
  if (totalPushups >= 18250) {
    const awarded = await awardIfNew(userId, "special_halfway");
    if (awarded) {
      unlocked.push({
        id: "special_halfway",
        name: "Halfway There",
        description: "Reach 18,250 pushups",
        icon: "🎊",
        category: "special",
      });
    }
  }

  // Check for night owl (logged after 10 PM)
  const hasNightEntry = entries.some((e) => {
    const hour = new Date(e.created_at).getHours();
    return hour >= 22;
  });
  if (hasNightEntry) {
    const awarded = await awardIfNew(userId, "special_night");
    if (awarded) {
      unlocked.push({
        id: "special_night",
        name: "Night Owl",
        description: "Log pushups after 10 PM",
        icon: "🌙",
        category: "special",
      });
    }
  }

  // Check for early bird (logged before 6 AM)
  const hasEarlyEntry = entries.some((e) => {
    const hour = new Date(e.created_at).getHours();
    return hour < 6;
  });
  if (hasEarlyEntry) {
    const awarded = await awardIfNew(userId, "special_early");
    if (awarded) {
      unlocked.push({
        id: "special_early",
        name: "Early Bird",
        description: "Log pushups before 6 AM",
        icon: "🌅",
        category: "special",
      });
    }
  }

  // Check perfect score (exactly 100, 10 times)
  const perfectScoreCount = entries.filter((e) => e.count === 100).length;
  if (perfectScoreCount >= 10) {
    const awarded = await awardIfNew(userId, "special_perfect");
    if (awarded) {
      unlocked.push({
        id: "special_perfect",
        name: "Perfect Score",
        description: "Log exactly 100 pushups (10 times)",
        icon: "🔢",
        category: "special",
      });
    }
  }

  return unlocked;
}

/**
 * Award achievement if user doesn't have it yet
 */
async function awardIfNew(userId: string, achievementId: string): Promise<boolean> {
  try {
    // @ts-expect-error - RPC function types
    const { data, error } = await supabase.rpc("award_achievement", {
      p_user_id: userId,
      p_achievement_id: achievementId,
    });

    if (error) {
      console.error("Error awarding achievement:", error);
      return false;
    }

    // @ts-expect-error - data typing
    return data?.success && !data?.already_earned;
  } catch (error) {
    console.error("Error in awardIfNew:", error);
    return false;
  }
}

/**
 * Calculate current streak
 */
function calculateCurrentStreak(entries: Array<{ entry_date: string }>): number {
  if (entries.length === 0) return 0;

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
  );

  let streak = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);

  for (const entry of sortedEntries) {
    const entryDate = new Date(entry.entry_date);
    entryDate.setHours(0, 0, 0, 0);

    if (streak === 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (entryDate.getTime() === today.getTime() || entryDate.getTime() === yesterday.getTime()) {
        streak = 1;
        expectedDate = new Date(entryDate);
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    } else if (entryDate.getTime() === expectedDate.getTime()) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Check if user has a perfect week (7 consecutive days of 100+)
 */
function hasPerfectWeek(entries: Array<{ entry_date: string; count: number }>): boolean {
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
  );

  let consecutiveDays = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);

  for (const entry of sortedEntries) {
    const entryDate = new Date(entry.entry_date);
    entryDate.setHours(0, 0, 0, 0);

    if (entry.count >= 100) {
      if (consecutiveDays === 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (
          entryDate.getTime() === today.getTime() ||
          entryDate.getTime() === yesterday.getTime()
        ) {
          consecutiveDays = 1;
          expectedDate = new Date(entryDate);
          expectedDate.setDate(expectedDate.getDate() - 1);
        }
      } else if (entryDate.getTime() === expectedDate.getTime()) {
        consecutiveDays++;
        expectedDate.setDate(expectedDate.getDate() - 1);

        if (consecutiveDays >= 7) return true;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return false;
}

/**
 * Check if user has a perfect month (30 consecutive days of 100+)
 */
function hasPerfectMonth(entries: Array<{ entry_date: string; count: number }>): boolean {
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
  );

  let consecutiveDays = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);

  for (const entry of sortedEntries) {
    const entryDate = new Date(entry.entry_date);
    entryDate.setHours(0, 0, 0, 0);

    if (entry.count >= 100) {
      if (consecutiveDays === 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (
          entryDate.getTime() === today.getTime() ||
          entryDate.getTime() === yesterday.getTime()
        ) {
          consecutiveDays = 1;
          expectedDate = new Date(entryDate);
          expectedDate.setDate(expectedDate.getDate() - 1);
        }
      } else if (entryDate.getTime() === expectedDate.getTime()) {
        consecutiveDays++;
        expectedDate.setDate(expectedDate.getDate() - 1);

        if (consecutiveDays >= 30) return true;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return false;
}
