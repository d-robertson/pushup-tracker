export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          invited_by: string | null;
          invited_at: string | null;
          onboarded_at: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          invited_by?: string | null;
          invited_at?: string | null;
          onboarded_at?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          invited_by?: string | null;
          invited_at?: string | null;
          onboarded_at?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          email: string;
          invited_by: string;
          token: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          invited_by: string;
          token: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          invited_by?: string;
          token?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
      };
      pushup_entries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          count: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entry_date: string;
          count: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entry_date?: string;
          count?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_progression: {
        Row: {
          user_id: string;
          start_date: string;
          target_total: number;
          daily_target: number;
          use_adaptive_progression: boolean;
          current_weekly_target: number | null;
          progression_mode: "standard" | "tapered" | "catch_up" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          start_date?: string;
          target_total?: number;
          daily_target?: number;
          use_adaptive_progression?: boolean;
          current_weekly_target?: number | null;
          progression_mode?: "standard" | "tapered" | "catch_up" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          start_date?: string;
          target_total?: number;
          daily_target?: number;
          use_adaptive_progression?: boolean;
          current_weekly_target?: number | null;
          progression_mode?: "standard" | "tapered" | "catch_up" | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      progression_snapshots: {
        Row: {
          id: string;
          user_id: string;
          snapshot_date: string;
          total_completed: number;
          seven_day_average: number | null;
          days_remaining: number | null;
          adjusted_daily_target: number | null;
          on_track: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          snapshot_date: string;
          total_completed: number;
          seven_day_average?: number | null;
          days_remaining?: number | null;
          adjusted_daily_target?: number | null;
          on_track?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          snapshot_date?: string;
          total_completed?: number;
          seven_day_average?: number | null;
          days_remaining?: number | null;
          adjusted_daily_target?: number | null;
          on_track?: boolean | null;
          created_at?: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string;
          category:
            | "milestone"
            | "streak"
            | "daily"
            | "consistency"
            | "recovery"
            | "special"
            | "social";
          icon_emoji: string | null;
          criteria: Json;
          rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" | null;
          points: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description: string;
          category:
            | "milestone"
            | "streak"
            | "daily"
            | "consistency"
            | "recovery"
            | "special"
            | "social";
          icon_emoji?: string | null;
          criteria: Json;
          rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary" | null;
          points?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          description?: string;
          category?:
            | "milestone"
            | "streak"
            | "daily"
            | "consistency"
            | "recovery"
            | "special"
            | "social";
          icon_emoji?: string | null;
          criteria?: Json;
          rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary" | null;
          points?: number;
          created_at?: string;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          earned_at: string;
          progress: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          earned_at?: string;
          progress?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          earned_at?: string;
          progress?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_user_stats: {
        Args: {
          user_uuid: string;
        };
        Returns: {
          total_pushups: number;
          seven_day_average: number;
          current_streak: number;
          longest_streak: number;
          days_active: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
