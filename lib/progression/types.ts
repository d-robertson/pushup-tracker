// Progression system types

export const CHALLENGE_START_DATE = new Date("2026-01-01");
export const CHALLENGE_END_DATE = new Date("2026-12-31");
export const TOTAL_PUSHUPS_GOAL = 36500;
export const TOTAL_DAYS = 365;
export const DAILY_BASE_TARGET = 100; // 36,500 / 365
export const MAX_DAILY_CAP = 200; // Injury prevention

export type ProgressionMode = "standard" | "catchup" | "ahead";

export interface UserHistoryEntry {
  entry_date: string;
  count: number;
}

export interface ProgressionData {
  // Current status
  mode: ProgressionMode;
  dailyTarget: number;
  currentTotal: number;
  expectedTotal: number;
  daysElapsed: number;
  daysRemaining: number;

  // Performance metrics
  sevenDayAverage: number;
  isOnTrack: boolean;
  deficit: number; // How many pushups behind (negative if ahead)
  percentComplete: number;

  // Projections
  projectedTotal: number; // Based on current average
  projectedCompletion: Date | null; // When they'll hit 36,500 at current pace
  catchupDaysNeeded: number; // How many days of extra effort needed

  // Messaging
  modeDescription: string;
  encouragementMessage: string;
}

export interface ProgressionSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  daily_target: number;
  mode: ProgressionMode;
  current_total: number;
  expected_total: number;
  seven_day_average: number;
  deficit: number;
  created_at: string;
}
