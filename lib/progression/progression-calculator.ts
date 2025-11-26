/**
 * Progression Calculator
 * Calculates adaptive daily targets based on user progress
 */

export interface ProgressionMode {
  mode: "standard" | "catch-up" | "ahead";
  dailyTarget: number;
  weeklyTarget: number;
  deficit: number;
  daysRemaining: number;
  projectedCompletion: number;
  onTrack: boolean;
}

export interface UserProgress {
  totalPushups: number;
  entries: Array<{
    date: string;
    count: number;
  }>;
}

// Challenge constants
const CHALLENGE_START = new Date("2026-01-01");
// const CHALLENGE_END = new Date("2026-12-31");
const TOTAL_DAYS = 365;
const TOTAL_GOAL = 36500;
const BASE_DAILY_TARGET = 100;
const MAX_DAILY_TARGET = 200; // Injury prevention cap
const CATCH_UP_THRESHOLD = -100; // More than 100 behind triggers catch-up mode

/**
 * Calculate the current progression mode and daily target
 */
export function calculateProgression(
  progress: UserProgress,
  currentDate: Date = new Date()
): ProgressionMode {
  // Calculate days elapsed since challenge start
  const daysElapsed = Math.max(
    0,
    Math.floor((currentDate.getTime() - CHALLENGE_START.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Calculate days remaining
  const daysRemaining = Math.max(
    1, // Prevent division by zero
    TOTAL_DAYS - daysElapsed
  );

  // Calculate expected pushups by this point
  const expectedPushups = daysElapsed * BASE_DAILY_TARGET;

  // Calculate actual pushups
  const actualPushups = progress.totalPushups;

  // Calculate deficit (negative means behind, positive means ahead)
  const deficit = actualPushups - expectedPushups;

  // Calculate 7-day rolling average
  const last7Days = progress.entries.slice(-7);
  const sevenDayTotal = last7Days.reduce((sum, entry) => sum + entry.count, 0);
  const sevenDayAverage = last7Days.length > 0 ? sevenDayTotal / last7Days.length : 0;

  // Calculate what's needed to reach the goal
  const pushupsNeeded = TOTAL_GOAL - actualPushups;
  const rawDailyTarget = pushupsNeeded / daysRemaining;

  // Apply injury prevention cap
  const dailyTarget = Math.min(Math.ceil(rawDailyTarget), MAX_DAILY_TARGET);

  // Determine mode
  let mode: "standard" | "catch-up" | "ahead";
  if (deficit < CATCH_UP_THRESHOLD) {
    mode = "catch-up";
  } else if (deficit > 100) {
    mode = "ahead";
  } else {
    mode = "standard";
  }

  // Calculate if user is on track (within 5% of expected)
  const tolerance = expectedPushups * 0.05;
  const onTrack = Math.abs(deficit) <= tolerance;

  // Project completion based on 7-day average
  const projectedDailyRate = sevenDayAverage > 0 ? sevenDayAverage : dailyTarget;
  const projectedCompletion = actualPushups + projectedDailyRate * daysRemaining;

  return {
    mode,
    dailyTarget,
    weeklyTarget: dailyTarget * 7,
    deficit,
    daysRemaining,
    projectedCompletion,
    onTrack,
  };
}

/**
 * Get a human-readable explanation of the current progression
 */
export function getProgressionExplanation(progression: ProgressionMode): string {
  if (progression.mode === "ahead") {
    return `You're ahead of schedule by ${progression.deficit} pushups! Keep up the great work. Your daily target is ${progression.dailyTarget} to stay on track.`;
  }

  if (progression.mode === "catch-up") {
    return `You're ${Math.abs(progression.deficit)} pushups behind schedule. Don't worry! Your adjusted daily target is ${progression.dailyTarget} pushups to get back on track over the next ${progression.daysRemaining} days.`;
  }

  // Standard mode
  if (progression.onTrack) {
    return `You're right on track! Keep hitting your daily target of ${progression.dailyTarget} pushups.`;
  }

  return `Your daily target is ${progression.dailyTarget} pushups. You have ${progression.daysRemaining} days remaining to reach the goal.`;
}

/**
 * Calculate streak information
 */
export function calculateStreak(entries: Array<{ date: string; count: number }>): {
  currentStreak: number;
  longestStreak: number;
  lastEntryDate: string | null;
} {
  if (entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastEntryDate: null };
  }

  // Sort entries by date (newest first)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);

  // Calculate current streak
  for (let i = 0; i < sortedEntries.length; i++) {
    const entryDate = new Date(sortedEntries[i]!.date);
    entryDate.setHours(0, 0, 0, 0);

    if (i === 0) {
      // Check if today or yesterday
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (entryDate.getTime() === today.getTime() || entryDate.getTime() === yesterday.getTime()) {
        currentStreak = 1;
        tempStreak = 1;
        expectedDate = new Date(entryDate);
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break; // Streak is broken
      }
    } else {
      if (entryDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
        tempStreak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        // Current streak ended, but continue for longest streak
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
        expectedDate = new Date(entryDate);
        expectedDate.setDate(expectedDate.getDate() - 1);
      }
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    lastEntryDate: sortedEntries[0]?.date || null,
  };
}

/**
 * Get motivational message based on progress
 */
export function getMotivationalMessage(progression: ProgressionMode, streak: number): string {
  if (streak >= 30) {
    return "🔥 30-day streak! You're unstoppable!";
  }

  if (streak >= 7) {
    return "⭐ Week streak! Keep the momentum going!";
  }

  if (progression.mode === "ahead") {
    return "💪 You're crushing it! Stay consistent!";
  }

  if (progression.mode === "catch-up") {
    return "🎯 You got this! One day at a time.";
  }

  if (progression.onTrack) {
    return "✨ Perfect pace! Keep it up!";
  }

  return "💯 Let's make today count!";
}
