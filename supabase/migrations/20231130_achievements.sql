-- ============================================================================
-- ACHIEVEMENTS MIGRATION
-- Gamification system with badges and achievements
-- ============================================================================

-- Create achievements table (stores all available achievements)
CREATE TABLE IF NOT EXISTS public.achievements (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(20) NOT NULL,
    requirement_value INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_achievements table (tracks which users have earned which achievements)
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate achievements per user
    UNIQUE(user_id, achievement_id)
);

-- Create indexes
CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id, earned_at DESC);
CREATE INDEX idx_user_achievements_achievement ON public.user_achievements(achievement_id);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view achievements
CREATE POLICY "Anyone can view achievements"
    ON public.achievements
    FOR SELECT
    USING (true);

-- RLS Policy: Users can view all user achievements (for leaderboard)
CREATE POLICY "Anyone can view user achievements"
    ON public.user_achievements
    FOR SELECT
    USING (true);

-- RLS Policy: Only authenticated users can insert achievements (via functions)
CREATE POLICY "Authenticated users can insert achievements"
    ON public.user_achievements
    FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- SEED ACHIEVEMENTS DATA
-- ============================================================================

-- Milestone Badges (Total Pushups)
INSERT INTO public.achievements (id, category, name, description, icon, requirement_value) VALUES
('milestone_100', 'milestone', 'First Step', 'Complete 100 total pushups', '🏁', 100),
('milestone_1000', 'milestone', 'Thousand Club', 'Complete 1,000 total pushups', '🎯', 1000),
('milestone_5000', 'milestone', 'Five Grand', 'Complete 5,000 total pushups', '💪', 5000),
('milestone_10000', 'milestone', 'Ten Thousand Strong', 'Complete 10,000 total pushups', '🔥', 10000),
('milestone_20000', 'milestone', 'Twenty K Champion', 'Complete 20,000 total pushups', '🏆', 20000),
('milestone_36500', 'milestone', 'Goal Complete', 'Complete the full 36,500 pushup challenge!', '💎', 36500)
ON CONFLICT (id) DO NOTHING;

-- Streak Badges (Consecutive Days)
INSERT INTO public.achievements (id, category, name, description, icon, requirement_value) VALUES
('streak_3', 'streak', 'Three Days Strong', 'Log pushups 3 days in a row', '🌟', 3),
('streak_7', 'streak', 'Week Warrior', 'Log pushups 7 days in a row', '⭐', 7),
('streak_14', 'streak', 'Two Week Titan', 'Log pushups 14 days in a row', '🌠', 14),
('streak_30', 'streak', 'Month Master', 'Log pushups 30 days in a row', '🔆', 30),
('streak_50', 'streak', 'Unbreakable', 'Log pushups 50 days in a row', '☀️', 50),
('streak_100', 'streak', 'Century Streak', 'Log pushups 100 days in a row', '🌞', 100),
('streak_365', 'streak', 'Year-Long Legend', 'Log pushups 365 days in a row', '🏅', 365)
ON CONFLICT (id) DO NOTHING;

-- Daily Achievement Badges
INSERT INTO public.achievements (id, category, name, description, icon, requirement_value) VALUES
('daily_100', 'daily', 'Century Club', 'Complete 100+ pushups in one day', '✨', 100),
('daily_150', 'daily', 'Overachiever', 'Complete 150+ pushups in one day', '💥', 150),
('daily_200', 'daily', 'Beast Mode', 'Complete 200+ pushups in one day', '🚀', 200),
('perfect_week', 'daily', 'Superhuman', 'Complete 100+ pushups every day for 7 days', '🦾', 7),
('perfect_month', 'daily', 'Perfect Month', 'Complete 100+ pushups every day for 30 days', '🎖️', 30)
ON CONFLICT (id) DO NOTHING;

-- Consistency Badges
INSERT INTO public.achievements (id, category, name, description, icon, requirement_value) VALUES
('consistency_monday', 'consistency', 'Never Miss Monday', 'Log pushups 4 consecutive Mondays', '📅', 4),
('consistency_weekend', 'consistency', 'Weekend Warrior', 'Log pushups 4 consecutive weekends', '🗓️', 4),
('consistency_monthly', 'consistency', 'Monthly Regular', 'Log pushups 30 days within a month', '📆', 30),
('consistency_target', 'consistency', 'On Target', 'Stay within ±5 of daily goal for 7 days', '🎯', 7)
ON CONFLICT (id) DO NOTHING;

-- Recovery Badges
INSERT INTO public.achievements (id, category, name, description, icon, requirement_value) VALUES
('recovery_bounce', 'recovery', 'Bounce Back', 'Return after missing 3+ days', '🔄', 3),
('recovery_resilient', 'recovery', 'Resilient', 'Catch up after falling 500+ pushups behind', '💚', 500),
('recovery_wind', 'recovery', 'Second Wind', 'Complete 200+ pushups after missing days', '🌱', 200)
ON CONFLICT (id) DO NOTHING;

-- Special Badges
INSERT INTO public.achievements (id, category, name, description, icon, requirement_value) VALUES
('special_newyear', 'special', 'New Year''s Hero', 'Log pushups on January 1, 2026', '🎆', NULL),
('special_night', 'special', 'Night Owl', 'Log pushups after 10 PM', '🌙', NULL),
('special_early', 'special', 'Early Bird', 'Log pushups before 6 AM', '🌅', NULL),
('special_perfect', 'special', 'Perfect Score', 'Log exactly 100 pushups (10 times)', '🔢', 10),
('special_halfway', 'special', 'Halfway There', 'Reach 18,250 pushups', '🎊', 18250)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to award an achievement to a user
CREATE OR REPLACE FUNCTION award_achievement(
    p_user_id UUID,
    p_achievement_id VARCHAR(50)
)
RETURNS JSONB AS $$
DECLARE
    v_achievement_id UUID;
    v_already_earned BOOLEAN;
BEGIN
    -- Check if user already has this achievement
    SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = p_user_id
        AND achievement_id = p_achievement_id
    ) INTO v_already_earned;

    IF v_already_earned THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Achievement already earned',
            'already_earned', true
        );
    END IF;

    -- Award the achievement
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (p_user_id, p_achievement_id)
    RETURNING id INTO v_achievement_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Achievement unlocked!',
        'achievement_id', v_achievement_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's achievements
CREATE OR REPLACE FUNCTION get_user_achievements(p_user_id UUID)
RETURNS TABLE (
    achievement_id VARCHAR(50),
    category VARCHAR(20),
    name VARCHAR(100),
    description TEXT,
    icon VARCHAR(20),
    earned_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.category,
        a.name,
        a.description,
        a.icon,
        ua.earned_at
    FROM public.user_achievements ua
    JOIN public.achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = p_user_id
    ORDER BY ua.earned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all achievements with user's progress
CREATE OR REPLACE FUNCTION get_achievements_with_progress(p_user_id UUID)
RETURNS TABLE (
    achievement_id VARCHAR(50),
    category VARCHAR(20),
    name VARCHAR(100),
    description TEXT,
    icon VARCHAR(20),
    requirement_value INTEGER,
    earned BOOLEAN,
    earned_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.category,
        a.name,
        a.description,
        a.icon,
        a.requirement_value,
        (ua.user_id IS NOT NULL) as earned,
        ua.earned_at
    FROM public.achievements a
    LEFT JOIN public.user_achievements ua
        ON a.id = ua.achievement_id AND ua.user_id = p_user_id
    ORDER BY a.category, a.requirement_value NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION award_achievement TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_achievements TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_achievements_with_progress TO authenticated, anon;

-- ============================================================================
-- DONE! Achievements system is ready
-- ============================================================================
