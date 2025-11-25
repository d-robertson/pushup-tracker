import { Database } from "./database.types";

// Helper types for easier access
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type PushupEntry = Database["public"]["Tables"]["pushup_entries"]["Row"];
export type PushupEntryInsert = Database["public"]["Tables"]["pushup_entries"]["Insert"];
export type PushupEntryUpdate = Database["public"]["Tables"]["pushup_entries"]["Update"];

export type UserProgression = Database["public"]["Tables"]["user_progression"]["Row"];
export type UserProgressionInsert = Database["public"]["Tables"]["user_progression"]["Insert"];
export type UserProgressionUpdate = Database["public"]["Tables"]["user_progression"]["Update"];

export type ProgressionSnapshot = Database["public"]["Tables"]["progression_snapshots"]["Row"];
export type Achievement = Database["public"]["Tables"]["achievements"]["Row"];
export type UserAchievement = Database["public"]["Tables"]["user_achievements"]["Row"];

export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
export type InvitationInsert = Database["public"]["Tables"]["invitations"]["Insert"];

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface UserStats {
  totalPushups: number;
  sevenDayAverage: number;
  currentStreak: number;
  longestStreak: number;
  daysActive: number;
}

export interface ProgressionData {
  userId: string;
  startDate: string;
  targetTotal: number;
  totalCompleted: number;
  remainingPushups: number;
  daysElapsed: number;
  daysRemaining: number;
  dailyTargetOriginal: number;
  dailyTargetAdjusted: number;
  sevenDayAverage: number;
  progressionMode: "standard" | "tapered" | "catch_up";
  onTrack: boolean;
  currentStreak: number;
  longestStreak: number;
  projectedCompletion: string;
  weeklyMilestone: {
    week: number;
    target: number;
    completed: number;
    remaining: number;
  };
}
