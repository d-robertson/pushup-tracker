import {
  CHALLENGE_START_DATE,
  CHALLENGE_END_DATE,
  TOTAL_PUSHUPS_GOAL,
  DAILY_BASE_TARGET,
  MAX_DAILY_CAP,
  type ProgressionMode,
  type ProgressionData,
  type UserHistoryEntry,
} from "./types";

/**
 * Calculate the number of days elapsed since challenge start
 */
export function getDaysElapsed(currentDate: Date = new Date()): number {
  const start = CHALLENGE_START_DATE;
  const diffTime = currentDate.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays + 1); // +1 because day 1 counts
}

/**
 * Calculate the number of days remaining until challenge end
 */
export function getDaysRemaining(currentDate: Date = new Date()): number {
  const end = CHALLENGE_END_DATE;
  const diffTime = end.getTime() - currentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Calculate the expected total pushups at this point in the challenge
 */
export function getExpectedTotal(currentDate: Date = new Date()): number {
  const daysElapsed = getDaysElapsed(currentDate);
  return Math.min(daysElapsed * DAILY_BASE_TARGET, TOTAL_PUSHUPS_GOAL);
}

/**
 * Calculate 7-day rolling average from user history
 */
export function calculateSevenDayAverage(history: UserHistoryEntry[]): number {
  if (history.length === 0) return 0;

  // Get last 7 entries (they're already sorted by date desc from the query)
  const last7Days = history.slice(0, 7);

  // Sum the counts
  const total = last7Days.reduce((sum, entry) => sum + entry.count, 0);

  // Calculate average (divide by actual number of days, not 7)
  return last7Days.length > 0 ? total / last7Days.length : 0;
}

/**
 * Determine the user's progression mode based on their progress
 */
export function determineProgressionMode(
  currentTotal: number,
  expectedTotal: number
): ProgressionMode {
  const deficit = expectedTotal - currentTotal;

  if (deficit <= 0) {
    // User is on track or ahead
    return "ahead";
  } else if (deficit <= DAILY_BASE_TARGET * 3) {
    // User is slightly behind (less than 3 days worth)
    return "standard";
  } else {
    // User is significantly behind
    return "catchup";
  }
}

/**
 * Calculate daily target using tapered catch-up algorithm
 */
export function calculateDailyTarget(
  mode: ProgressionMode,
  currentTotal: number,
  daysRemaining: number,
  sevenDayAverage: number
): number {
  // If challenge is over, return 0
  if (daysRemaining <= 0) {
    return 0;
  }

  const remainingPushups = TOTAL_PUSHUPS_GOAL - currentTotal;

  // If already at or above goal
  if (remainingPushups <= 0) {
    return 0;
  }

  if (mode === "ahead" || mode === "standard") {
    // Standard mode: just maintain the base pace
    return DAILY_BASE_TARGET;
  }

  // Catch-up mode: calculate needed daily rate
  const naiveTarget = Math.ceil(remainingPushups / daysRemaining);

  // Apply tapered progression
  // Don't jump too high too fast - use 7-day average as baseline
  const userCapacity = Math.max(sevenDayAverage, DAILY_BASE_TARGET);

  // Allow gradual increase: max 20% above current capacity
  const maxIncrease = Math.ceil(userCapacity * 1.2);

  // Take the minimum of naive target and max increase
  const taperedTarget = Math.min(naiveTarget, maxIncrease);

  // Apply injury prevention cap
  const cappedTarget = Math.min(taperedTarget, MAX_DAILY_CAP);

  // Never go below base target
  return Math.max(cappedTarget, DAILY_BASE_TARGET);
}

/**
 * Calculate when user will complete challenge at current pace
 */
export function calculateProjectedCompletion(
  currentTotal: number,
  sevenDayAverage: number,
  currentDate: Date = new Date()
): Date | null {
  if (sevenDayAverage <= 0) return null;

  const remainingPushups = TOTAL_PUSHUPS_GOAL - currentTotal;
  if (remainingPushups <= 0) return currentDate; // Already done

  const daysNeeded = Math.ceil(remainingPushups / sevenDayAverage);
  const completionDate = new Date(currentDate);
  completionDate.setDate(completionDate.getDate() + daysNeeded);

  return completionDate;
}

/**
 * Get mode description for UI
 */
export function getModeDescription(mode: ProgressionMode): string {
  switch (mode) {
    case "ahead":
      return "You're ahead of schedule! 🎉";
    case "standard":
      return "You're on track! 💪";
    case "catchup":
      return "Catch-up mode - Let's get back on track! 🚀";
  }
}

/**
 * Generate encouragement message based on user's status
 */
export function getEncouragementMessage(
  mode: ProgressionMode,
  deficit: number,
  percentComplete: number
): string {
  if (mode === "ahead") {
    return `Amazing work! You're ${Math.abs(deficit)} pushups ahead!`;
  }

  if (mode === "standard") {
    if (percentComplete >= 75) {
      return "You're in the home stretch! Keep it up!";
    }
    return "Steady progress! You're doing great!";
  }

  // Catch-up mode
  if (deficit <= 500) {
    return "You're close! A few strong days and you'll be caught up!";
  } else if (deficit <= 1000) {
    return "Don't worry, the adjusted targets will help you catch up!";
  } else {
    return "One day at a time. You've got this!";
  }
}

/**
 * Main progression calculation function
 * This is the core algorithm that brings everything together
 */
export function calculateProgression(
  currentTotal: number,
  history: UserHistoryEntry[],
  currentDate: Date = new Date()
): ProgressionData {
  // Calculate time metrics
  const daysElapsed = getDaysElapsed(currentDate);
  const daysRemaining = getDaysRemaining(currentDate);
  const expectedTotal = getExpectedTotal(currentDate);

  // Calculate performance metrics
  const sevenDayAverage = calculateSevenDayAverage(history);
  const deficit = expectedTotal - currentTotal;
  const isOnTrack = deficit <= DAILY_BASE_TARGET; // Within one day's worth
  const percentComplete = (currentTotal / TOTAL_PUSHUPS_GOAL) * 100;

  // Determine mode and calculate target
  const mode = determineProgressionMode(currentTotal, expectedTotal);
  const dailyTarget = calculateDailyTarget(mode, currentTotal, daysRemaining, sevenDayAverage);

  // Calculate projections
  const projectedTotal = currentTotal + sevenDayAverage * daysRemaining;
  const projectedCompletion = calculateProjectedCompletion(
    currentTotal,
    sevenDayAverage,
    currentDate
  );

  // Calculate catch-up days needed
  let catchupDaysNeeded = 0;
  if (deficit > 0 && dailyTarget > DAILY_BASE_TARGET) {
    const extraPerDay = dailyTarget - DAILY_BASE_TARGET;
    catchupDaysNeeded = Math.ceil(deficit / extraPerDay);
  }

  // Get descriptions
  const modeDescription = getModeDescription(mode);
  const encouragementMessage = getEncouragementMessage(mode, deficit, percentComplete);

  return {
    mode,
    dailyTarget,
    currentTotal,
    expectedTotal,
    daysElapsed,
    daysRemaining,
    sevenDayAverage,
    isOnTrack,
    deficit,
    percentComplete,
    projectedTotal,
    projectedCompletion,
    catchupDaysNeeded,
    modeDescription,
    encouragementMessage,
  };
}
