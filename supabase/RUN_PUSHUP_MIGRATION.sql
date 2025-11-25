-- ============================================================================
-- PUSHUP TRACKING MIGRATION
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================================================

-- This migration adds all the functions needed for pushup tracking

-- Function to add pushups (creates or updates entry for today)
CREATE OR REPLACE FUNCTION add_pushups(
    p_user_id UUID,
    p_count INTEGER,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_entry_id UUID;
    v_new_total INTEGER;
    v_entry_date DATE;
BEGIN
    v_entry_date := CURRENT_DATE;

    -- Check if entry exists for today
    SELECT id, count INTO v_entry_id, v_new_total
    FROM public.pushup_entries
    WHERE user_id = p_user_id
      AND entry_date = v_entry_date;

    IF v_entry_id IS NOT NULL THEN
        -- Update existing entry
        v_new_total := v_new_total + p_count;

        UPDATE public.pushup_entries
        SET count = v_new_total,
            notes = COALESCE(p_notes, notes),
            updated_at = NOW()
        WHERE id = v_entry_id;
    ELSE
        -- Create new entry
        v_new_total := p_count;

        INSERT INTO public.pushup_entries (user_id, entry_date, count, notes)
        VALUES (p_user_id, v_entry_date, p_count, p_notes)
        RETURNING id INTO v_entry_id;
    END IF;

    -- Return the updated entry info
    RETURN jsonb_build_object(
        'entry_id', v_entry_id,
        'entry_date', v_entry_date,
        'total_count', v_new_total,
        'added_count', p_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get today's pushup count for a user
CREATE OR REPLACE FUNCTION get_todays_pushups(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COALESCE(count, 0) INTO v_count
    FROM public.pushup_entries
    WHERE user_id = p_user_id
      AND entry_date = CURRENT_DATE;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pushup history for a user (last N days)
CREATE OR REPLACE FUNCTION get_pushup_history(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    entry_date DATE,
    count INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.entry_date,
        e.count,
        e.notes,
        e.created_at,
        e.updated_at
    FROM public.pushup_entries e
    WHERE e.user_id = p_user_id
      AND e.entry_date >= CURRENT_DATE - p_days
    ORDER BY e.entry_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user stats
CREATE OR REPLACE FUNCTION get_user_pushup_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total INTEGER;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_today_count INTEGER;
    v_days_active INTEGER;
    v_average DECIMAL(10,2);
BEGIN
    -- Total pushups
    SELECT COALESCE(SUM(count), 0) INTO v_total
    FROM public.pushup_entries
    WHERE user_id = p_user_id;

    -- Today's count
    SELECT COALESCE(count, 0) INTO v_today_count
    FROM public.pushup_entries
    WHERE user_id = p_user_id
      AND entry_date = CURRENT_DATE;

    -- Days active
    SELECT COUNT(DISTINCT entry_date) INTO v_days_active
    FROM public.pushup_entries
    WHERE user_id = p_user_id;

    -- Average per day (only counting days with entries)
    IF v_days_active > 0 THEN
        v_average := v_total::DECIMAL / v_days_active;
    ELSE
        v_average := 0;
    END IF;

    -- Calculate current streak (simplified - counts consecutive days from today backwards)
    WITH RECURSIVE streak AS (
        SELECT
            entry_date,
            1 as streak_length
        FROM public.pushup_entries
        WHERE user_id = p_user_id
          AND entry_date = CURRENT_DATE

        UNION ALL

        SELECT
            e.entry_date,
            s.streak_length + 1
        FROM public.pushup_entries e
        INNER JOIN streak s ON e.entry_date = s.entry_date - 1
        WHERE e.user_id = p_user_id
    )
    SELECT COALESCE(MAX(streak_length), 0) INTO v_current_streak
    FROM streak;

    -- Set longest streak to current streak for now (simplified)
    v_longest_streak := v_current_streak;

    RETURN jsonb_build_object(
        'total_pushups', v_total,
        'today_count', v_today_count,
        'current_streak', v_current_streak,
        'longest_streak', v_longest_streak,
        'days_active', v_days_active,
        'average_per_day', v_average
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_pushups TO authenticated;
GRANT EXECUTE ON FUNCTION get_todays_pushups TO authenticated;
GRANT EXECUTE ON FUNCTION get_pushup_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_pushup_stats TO authenticated;

-- ============================================================================
-- LEADERBOARD FUNCTION
-- ============================================================================

-- Get all users with their stats for leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    email TEXT,
    device_name TEXT,
    total_pushups BIGINT,
    current_streak INTEGER,
    today_pushups BIGINT,
    week_pushups BIGINT,
    month_pushups BIGINT,
    days_active BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS user_id,
        p.display_name,
        p.email,
        p.device_name,
        COALESCE(SUM(pe.count), 0) AS total_pushups,
        COALESCE(
            (
                WITH RECURSIVE streak AS (
                    SELECT
                        pe2.entry_date,
                        1 as streak_length
                    FROM public.pushup_entries pe2
                    WHERE pe2.user_id = p.id
                      AND pe2.entry_date = CURRENT_DATE

                    UNION ALL

                    SELECT
                        pe3.entry_date,
                        s.streak_length + 1
                    FROM public.pushup_entries pe3
                    INNER JOIN streak s ON pe3.entry_date = s.entry_date - 1
                    WHERE pe3.user_id = p.id
                )
                SELECT COALESCE(MAX(streak_length), 0)
                FROM streak
            ),
            0
        ) AS current_streak,
        COALESCE(
            (
                SELECT SUM(count)
                FROM public.pushup_entries pe_today
                WHERE pe_today.user_id = p.id
                  AND pe_today.entry_date = CURRENT_DATE
            ),
            0
        ) AS today_pushups,
        COALESCE(
            (
                SELECT SUM(count)
                FROM public.pushup_entries pe_week
                WHERE pe_week.user_id = p.id
                  AND pe_week.entry_date >= CURRENT_DATE - INTERVAL '7 days'
            ),
            0
        ) AS week_pushups,
        COALESCE(
            (
                SELECT SUM(count)
                FROM public.pushup_entries pe_month
                WHERE pe_month.user_id = p.id
                  AND pe_month.entry_date >= CURRENT_DATE - INTERVAL '30 days'
            ),
            0
        ) AS month_pushups,
        COALESCE(
            (
                SELECT COUNT(DISTINCT entry_date)
                FROM public.pushup_entries pe_days
                WHERE pe_days.user_id = p.id
            ),
            0
        ) AS days_active
    FROM public.profiles p
    LEFT JOIN public.pushup_entries pe ON pe.user_id = p.id
    GROUP BY p.id, p.display_name, p.email, p.device_name
    ORDER BY total_pushups DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_leaderboard TO authenticated;

-- ============================================================================
-- DONE! You can now go back to the app and start tracking pushups!
-- The leaderboard will show everyone's progress!
-- ============================================================================
