-- Leaderboard function to get all users ranked by different metrics

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
