-- Functions for pushup entry management

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

    -- Calculate current streak
    WITH date_series AS (
        SELECT CURRENT_DATE - generate_series(0, 365) AS check_date
    ),
    entries_with_dates AS (
        SELECT
            ds.check_date,
            CASE WHEN e.entry_date IS NOT NULL THEN 1 ELSE 0 END as has_entry
        FROM date_series ds
        LEFT JOIN public.pushup_entries e
            ON e.entry_date = ds.check_date
            AND e.user_id = p_user_id
        ORDER BY ds.check_date DESC
    )
    SELECT COUNT(*) INTO v_current_streak
    FROM entries_with_dates
    WHERE has_entry = 1
      AND check_date <= (
          SELECT MIN(check_date)
          FROM entries_with_dates
          WHERE has_entry = 0
      );

    -- Calculate longest streak (simplified version - can be optimized)
    SELECT COALESCE(MAX(streak_length), 0) INTO v_longest_streak
    FROM (
        SELECT
            entry_date,
            entry_date - ROW_NUMBER() OVER (ORDER BY entry_date)::INTEGER AS streak_group
        FROM public.pushup_entries
        WHERE user_id = p_user_id
    ) grouped
    GROUP BY streak_group
    CROSS JOIN LATERAL (
        SELECT COUNT(*) as streak_length
        FROM public.pushup_entries
        WHERE user_id = p_user_id
          AND entry_date - ROW_NUMBER() OVER (ORDER BY entry_date)::INTEGER = grouped.streak_group
    ) streak_calc;

    -- If no longest streak calculated, use current streak
    IF v_longest_streak = 0 THEN
        v_longest_streak := v_current_streak;
    END IF;

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
