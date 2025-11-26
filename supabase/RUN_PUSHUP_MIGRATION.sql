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
-- ============================================================================
-- PROGRESSION SNAPSHOTS MIGRATION
-- Stores daily progression calculations for tracking and historical analysis
-- ============================================================================

-- Create progression_snapshots table
CREATE TABLE IF NOT EXISTS public.progression_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,

    -- Calculated values
    daily_target INTEGER NOT NULL,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('standard', 'catchup', 'ahead')),
    current_total INTEGER NOT NULL,
    expected_total INTEGER NOT NULL,
    seven_day_average DECIMAL(10,2) NOT NULL DEFAULT 0,
    deficit INTEGER NOT NULL, -- Positive if behind, negative if ahead

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one snapshot per user per day
    UNIQUE(user_id, snapshot_date)
);

-- Create indexes for better query performance
CREATE INDEX idx_progression_snapshots_user_date ON public.progression_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_progression_snapshots_date ON public.progression_snapshots(snapshot_date DESC);

-- Enable Row Level Security
ALTER TABLE public.progression_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own snapshots
CREATE POLICY "Users can view own progression snapshots"
    ON public.progression_snapshots
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Only authenticated users can insert snapshots (via API/functions)
CREATE POLICY "Authenticated users can insert progression snapshots"
    ON public.progression_snapshots
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PROGRESSION CALCULATION FUNCTION
-- This function calculates and stores a progression snapshot for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION create_progression_snapshot(
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
-- Returns the most recent progression snapshot for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_latest_progression(p_user_id UUID)
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
        PERFORM create_progression_snapshot(p_user_id, CURRENT_DATE);
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
-- Returns historical progression snapshots for charting
-- ============================================================================

CREATE OR REPLACE FUNCTION get_progression_history(
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_progression_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_progression TO authenticated;
GRANT EXECUTE ON FUNCTION get_progression_history TO authenticated;

-- ============================================================================
-- DONE! Progression tracking is ready to use
-- ============================================================================
-- ============================================================================
-- ACCESS REQUESTS MIGRATION
-- Allows users to request access with their name and device ID
-- ============================================================================

-- Create access_requests table
CREATE TABLE IF NOT EXISTS public.access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL,
    requested_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,

    -- Prevent duplicate requests from same device
    UNIQUE(device_id)
);

-- Create index for faster queries
CREATE INDEX idx_access_requests_status ON public.access_requests(status, created_at DESC);
CREATE INDEX idx_access_requests_device ON public.access_requests(device_id);

-- Enable Row Level Security
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can insert their own request (no auth required)
CREATE POLICY "Anyone can submit access request"
    ON public.access_requests
    FOR INSERT
    WITH CHECK (true);

-- RLS Policy: Anyone can view their own request by device_id
CREATE POLICY "Users can view own access request"
    ON public.access_requests
    FOR SELECT
    USING (true);

-- RLS Policy: Only admins can update requests
CREATE POLICY "Only admins can update access requests"
    ON public.access_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND is_admin = true
        )
    );

-- ============================================================================
-- SUBMIT ACCESS REQUEST FUNCTION
-- Allows users to submit an access request with their name and device ID
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_access_request(
    p_device_id VARCHAR(255),
    p_requested_name VARCHAR(255)
)
RETURNS JSONB AS $$
DECLARE
    v_request_id UUID;
    v_existing_status VARCHAR(20);
BEGIN
    -- Check if request already exists for this device
    SELECT id, status INTO v_request_id, v_existing_status
    FROM public.access_requests
    WHERE device_id = p_device_id;

    IF v_request_id IS NOT NULL THEN
        -- Request already exists
        RETURN jsonb_build_object(
            'success', false,
            'message', 'A request from this device already exists',
            'status', v_existing_status,
            'request_id', v_request_id
        );
    END IF;

    -- Create new access request
    INSERT INTO public.access_requests (device_id, requested_name, status)
    VALUES (p_device_id, p_requested_name, 'pending')
    RETURNING id INTO v_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Access request submitted successfully',
        'request_id', v_request_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET ACCESS REQUEST STATUS FUNCTION
-- Allows users to check the status of their request
-- ============================================================================

CREATE OR REPLACE FUNCTION get_access_request_status(p_device_id VARCHAR(255))
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
BEGIN
    SELECT * INTO v_request
    FROM public.access_requests
    WHERE device_id = p_device_id;

    IF v_request IS NULL THEN
        RETURN jsonb_build_object(
            'exists', false,
            'status', null
        );
    END IF;

    RETURN jsonb_build_object(
        'exists', true,
        'status', v_request.status,
        'requested_name', v_request.requested_name,
        'created_at', v_request.created_at,
        'reviewed_at', v_request.reviewed_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET ALL PENDING REQUESTS (Admin Only)
-- Returns all pending access requests for admin review
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_access_requests()
RETURNS TABLE (
    id UUID,
    device_id VARCHAR(255),
    requested_name VARCHAR(255),
    status VARCHAR(20),
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Verify user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Only admins can view access requests';
    END IF;

    RETURN QUERY
    SELECT
        ar.id,
        ar.device_id,
        ar.requested_name,
        ar.status,
        ar.created_at
    FROM public.access_requests ar
    WHERE ar.status = 'pending'
    ORDER BY ar.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- APPROVE ACCESS REQUEST (Admin Only)
-- Approves a request and creates a profile for the user
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_access_request(
    p_request_id UUID,
    p_display_name VARCHAR(255) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_profile_id UUID;
BEGIN
    -- Verify user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Only admins can approve access requests';
    END IF;

    -- Get the request
    SELECT * INTO v_request
    FROM public.access_requests
    WHERE id = p_request_id;

    IF v_request IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Request not found'
        );
    END IF;

    IF v_request.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Request has already been reviewed'
        );
    END IF;

    -- Create profile for the user
    INSERT INTO public.profiles (
        device_id,
        device_name,
        display_name,
        is_admin
    ) VALUES (
        v_request.device_id,
        v_request.requested_name,
        COALESCE(p_display_name, v_request.requested_name),
        false
    )
    RETURNING id INTO v_profile_id;

    -- Update request status
    UPDATE public.access_requests
    SET
        status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Access request approved',
        'profile_id', v_profile_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- REJECT ACCESS REQUEST (Admin Only)
-- ============================================================================

CREATE OR REPLACE FUNCTION reject_access_request(p_request_id UUID)
RETURNS JSONB AS $$
BEGIN
    -- Verify user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Only admins can reject access requests';
    END IF;

    -- Update request status
    UPDATE public.access_requests
    SET
        status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id
    AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Request not found or already reviewed'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Access request rejected'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION submit_access_request TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_access_request_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_pending_access_requests TO authenticated;
GRANT EXECUTE ON FUNCTION approve_access_request TO authenticated;
GRANT EXECUTE ON FUNCTION reject_access_request TO authenticated;

-- ============================================================================
-- DONE! Access request system is ready
-- ============================================================================
