-- ============================================================================
-- FIX: Create only the missing progression functions
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing functions if they exist (to avoid conflicts)
DROP FUNCTION IF EXISTS public.create_progression_snapshot(UUID, DATE);
DROP FUNCTION IF EXISTS public.get_latest_progression(UUID);
DROP FUNCTION IF EXISTS public.get_progression_history(UUID, INTEGER);

-- ============================================================================
-- PROGRESSION CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_progression_snapshot(
    p_user_id UUID,
    p_snapshot_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    v_current_total INTEGER;
    v_expected_total INTEGER;
    v_seven_day_avg DECIMAL(10,2);
    v_mode VARCHAR(20);
    v_daily_target INTEGER;
    v_deficit INTEGER;
    v_days_elapsed INTEGER;
    v_days_remaining INTEGER;
    v_snapshot_id UUID;
BEGIN
    -- Get user's current total
    SELECT COALESCE(SUM(count), 0) INTO v_current_total
    FROM public.pushup_entries
    WHERE user_id = p_user_id;

    -- Calculate days elapsed and remaining
    v_days_elapsed := p_snapshot_date - DATE '2026-01-01' + 1;
    v_days_remaining := DATE '2026-12-31' - p_snapshot_date;

    -- Ensure we don't have negative days
    v_days_elapsed := GREATEST(v_days_elapsed, 0);
    v_days_remaining := GREATEST(v_days_remaining, 0);

    -- Calculate expected total (100 per day)
    v_expected_total := LEAST(v_days_elapsed * 100, 36500);

    -- Calculate 7-day average
    SELECT COALESCE(AVG(count), 0) INTO v_seven_day_avg
    FROM (
        SELECT count
        FROM public.pushup_entries
        WHERE user_id = p_user_id
          AND entry_date >= p_snapshot_date - INTERVAL '6 days'
          AND entry_date <= p_snapshot_date
        ORDER BY entry_date DESC
        LIMIT 7
    ) recent_entries;

    -- Calculate deficit
    v_deficit := v_expected_total - v_current_total;

    -- Determine mode
    IF v_deficit <= 0 THEN
        v_mode := 'ahead';
    ELSIF v_deficit <= 300 THEN -- Within 3 days
        v_mode := 'standard';
    ELSE
        v_mode := 'catchup';
    END IF;

    -- Calculate daily target based on mode
    IF v_days_remaining <= 0 THEN
        v_daily_target := 0;
    ELSIF v_mode IN ('ahead', 'standard') THEN
        v_daily_target := 100;
    ELSE
        -- Catch-up mode with tapered progression
        DECLARE
            v_remaining_pushups INTEGER;
            v_naive_target INTEGER;
            v_user_capacity DECIMAL(10,2);
            v_max_increase INTEGER;
            v_tapered_target INTEGER;
        BEGIN
            v_remaining_pushups := 36500 - v_current_total;
            v_naive_target := CEIL(v_remaining_pushups::DECIMAL / v_days_remaining);

            -- Use 7-day average as baseline capacity
            v_user_capacity := GREATEST(v_seven_day_avg, 100);

            -- Allow 20% increase above capacity
            v_max_increase := CEIL(v_user_capacity * 1.2);

            -- Apply taper
            v_tapered_target := LEAST(v_naive_target, v_max_increase);

            -- Apply injury cap (200 max)
            v_daily_target := LEAST(v_tapered_target, 200);

            -- Never go below base target
            v_daily_target := GREATEST(v_daily_target, 100);
        END;
    END IF;

    -- Insert or update snapshot
    INSERT INTO public.progression_snapshots (
        user_id,
        snapshot_date,
        daily_target,
        mode,
        current_total,
        expected_total,
        seven_day_average,
        deficit
    ) VALUES (
        p_user_id,
        p_snapshot_date,
        v_daily_target,
        v_mode,
        v_current_total,
        v_expected_total,
        v_seven_day_avg,
        v_deficit
    )
    ON CONFLICT (user_id, snapshot_date)
    DO UPDATE SET
        daily_target = EXCLUDED.daily_target,
        mode = EXCLUDED.mode,
        current_total = EXCLUDED.current_total,
        expected_total = EXCLUDED.expected_total,
        seven_day_average = EXCLUDED.seven_day_average,
        deficit = EXCLUDED.deficit,
        created_at = NOW()
    RETURNING id INTO v_snapshot_id;

    -- Return the snapshot data
    RETURN jsonb_build_object(
        'snapshot_id', v_snapshot_id,
        'daily_target', v_daily_target,
        'mode', v_mode,
        'current_total', v_current_total,
        'expected_total', v_expected_total,
        'seven_day_average', v_seven_day_avg,
        'deficit', v_deficit,
        'days_elapsed', v_days_elapsed,
        'days_remaining', v_days_remaining
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET LATEST PROGRESSION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_latest_progression(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_snapshot RECORD;
    v_has_snapshot BOOLEAN;
BEGIN
    -- Check if user has a snapshot from today
    SELECT EXISTS(
        SELECT 1 FROM public.progression_snapshots
        WHERE user_id = p_user_id
          AND snapshot_date = CURRENT_DATE
    ) INTO v_has_snapshot;

    -- If no snapshot today, create one
    IF NOT v_has_snapshot THEN
        PERFORM public.create_progression_snapshot(p_user_id, CURRENT_DATE);
    END IF;

    -- Get the latest snapshot
    SELECT * INTO v_snapshot
    FROM public.progression_snapshots
    WHERE user_id = p_user_id
    ORDER BY snapshot_date DESC
    LIMIT 1;

    IF v_snapshot IS NULL THEN
        RETURN NULL;
    END IF;

    -- Return as JSON
    RETURN jsonb_build_object(
        'daily_target', v_snapshot.daily_target,
        'mode', v_snapshot.mode,
        'current_total', v_snapshot.current_total,
        'expected_total', v_snapshot.expected_total,
        'seven_day_average', v_snapshot.seven_day_average,
        'deficit', v_snapshot.deficit,
        'snapshot_date', v_snapshot.snapshot_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET PROGRESSION HISTORY FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_progression_history(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    snapshot_date DATE,
    daily_target INTEGER,
    mode VARCHAR(20),
    current_total INTEGER,
    expected_total INTEGER,
    seven_day_average DECIMAL(10,2),
    deficit INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.snapshot_date,
        ps.daily_target,
        ps.mode,
        ps.current_total,
        ps.expected_total,
        ps.seven_day_average,
        ps.deficit
    FROM public.progression_snapshots ps
    WHERE ps.user_id = p_user_id
      AND ps.snapshot_date >= CURRENT_DATE - p_days
    ORDER BY ps.snapshot_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.create_progression_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_progression TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_progression_history TO authenticated;

-- ============================================================================
-- DONE! The progression functions are now created
-- ============================================================================
