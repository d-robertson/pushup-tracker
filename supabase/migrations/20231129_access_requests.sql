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
