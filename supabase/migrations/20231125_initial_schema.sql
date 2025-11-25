-- Pushup Tracker Initial Schema Migration
-- This migration creates all tables, indexes, RLS policies, functions, and triggers

-- Users table (extended from Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    invited_by UUID REFERENCES public.profiles(id),
    invited_at TIMESTAMPTZ,
    onboarded_at TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations table
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES public.profiles(id),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pushup entries table
CREATE TABLE public.pushup_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    count INTEGER NOT NULL CHECK (count >= 0 AND count <= 1000),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one entry per user per day
    UNIQUE(user_id, entry_date)
);

-- User progression settings
CREATE TABLE public.user_progression (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT '2026-01-01',
    target_total INTEGER NOT NULL DEFAULT 36500,
    daily_target INTEGER NOT NULL DEFAULT 100,
    use_adaptive_progression BOOLEAN DEFAULT TRUE,
    current_weekly_target INTEGER,
    progression_mode TEXT CHECK (progression_mode IN ('standard', 'tapered', 'catch_up')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progression snapshots (for historical tracking)
CREATE TABLE public.progression_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_completed INTEGER NOT NULL,
    seven_day_average NUMERIC(5,2),
    days_remaining INTEGER,
    adjusted_daily_target INTEGER,
    on_track BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, snapshot_date)
);

-- Achievement definitions (populated with seed data)
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL, -- e.g., 'first_step', 'week_warrior'
    name TEXT NOT NULL, -- e.g., 'First Step'
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('milestone', 'streak', 'daily', 'consistency', 'recovery', 'special', 'social')),
    icon_emoji TEXT, -- e.g., '🏁'
    criteria JSONB NOT NULL, -- Flexible criteria definition
    rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    points INTEGER DEFAULT 0, -- Optional point system
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements (earned badges)
CREATE TABLE public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    progress INTEGER DEFAULT 100, -- Percentage toward unlocking (100 = unlocked)

    UNIQUE(user_id, achievement_id)
);

-- Indexes for performance
CREATE INDEX idx_pushup_entries_user_date ON public.pushup_entries(user_id, entry_date DESC);
CREATE INDEX idx_pushup_entries_date ON public.pushup_entries(entry_date);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_progression_snapshots_user_date ON public.progression_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_achievements_category ON public.achievements(category);
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned_at ON public.user_achievements(user_id, earned_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pushup_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles but only update their own
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Pushup entries: Users can only access their own entries
CREATE POLICY "Users can view own pushup entries" ON public.pushup_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pushup entries" ON public.pushup_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pushup entries" ON public.pushup_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pushup entries" ON public.pushup_entries
    FOR DELETE USING (auth.uid() = user_id);

-- User progression: Users can only access their own progression
CREATE POLICY "Users can view own progression" ON public.user_progression
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progression" ON public.user_progression
    FOR UPDATE USING (auth.uid() = user_id);

-- Progression snapshots: Users can only access their own snapshots
CREATE POLICY "Users can view own snapshots" ON public.progression_snapshots
    FOR SELECT USING (auth.uid() = user_id);

-- Invitations: Only admins can manage invitations
CREATE POLICY "Admins can manage invitations" ON public.invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Achievements: All users can view achievement definitions
CREATE POLICY "Users can view achievements" ON public.achievements
    FOR SELECT USING (true);

-- User achievements: Users can only view their own earned badges
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert achievements (via triggers/functions)
CREATE POLICY "System can insert achievements" ON public.user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions and Triggers

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pushup_entries_updated_at
    BEFORE UPDATE ON public.pushup_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progression_updated_at
    BEFORE UPDATE ON public.user_progression
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate user statistics
CREATE OR REPLACE FUNCTION calculate_user_stats(user_uuid UUID)
RETURNS TABLE (
    total_pushups BIGINT,
    seven_day_average NUMERIC,
    current_streak INTEGER,
    longest_streak INTEGER,
    days_active INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_counts AS (
        SELECT entry_date, count
        FROM public.pushup_entries
        WHERE user_id = user_uuid
        ORDER BY entry_date DESC
    ),
    streak_calc AS (
        SELECT
            entry_date,
            entry_date - (ROW_NUMBER() OVER (ORDER BY entry_date))::INTEGER AS streak_group
        FROM daily_counts
        WHERE count >= 100
    )
    SELECT
        COALESCE(SUM(pe.count), 0)::BIGINT as total_pushups,
        COALESCE(AVG(pe.count) FILTER (
            WHERE pe.entry_date >= CURRENT_DATE - INTERVAL '7 days'
        ), 0)::NUMERIC as seven_day_average,
        COALESCE(MAX(streak_length) FILTER (
            WHERE streak_group = (
                SELECT streak_group
                FROM streak_calc
                WHERE entry_date = CURRENT_DATE
            )
        ), 0)::INTEGER as current_streak,
        COALESCE(MAX(streak_length), 0)::INTEGER as longest_streak,
        COUNT(DISTINCT pe.entry_date)::INTEGER as days_active
    FROM public.pushup_entries pe
    LEFT JOIN (
        SELECT streak_group, COUNT(*) as streak_length
        FROM streak_calc
        GROUP BY streak_group
    ) streaks ON true
    WHERE pe.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, created_at)
    VALUES (NEW.id, NEW.email, NOW());

    INSERT INTO public.user_progression (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
