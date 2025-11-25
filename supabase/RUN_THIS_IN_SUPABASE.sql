-- ============================================================================
-- COPY AND PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR
-- ============================================================================

-- Step 1: Clean up existing data
-- ============================================================================
DELETE FROM public.profiles;
DELETE FROM public.user_progression;

-- Step 2: Update the create_device_user function to handle conflicts
-- ============================================================================
CREATE OR REPLACE FUNCTION create_device_user(
    p_device_id TEXT,
    p_device_name TEXT,
    p_device_fingerprint TEXT,
    p_email TEXT DEFAULT NULL,
    p_invited_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
    existing_user_id UUID;
BEGIN
    -- Check if a user already exists with this device_id
    SELECT id INTO existing_user_id
    FROM public.profiles
    WHERE device_id = p_device_id;

    IF existing_user_id IS NOT NULL THEN
        -- User already exists with this device ID
        RETURN existing_user_id;
    END IF;

    -- Create anonymous auth user
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt('', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"device","providers":["device"]}',
        jsonb_build_object('device_id', p_device_id, 'device_name', p_device_name),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    )
    RETURNING id INTO new_user_id;

    -- Create profile with ON CONFLICT handling
    INSERT INTO public.profiles (
        id,
        email,
        device_id,
        device_name,
        device_fingerprint,
        invited_by,
        invited_at,
        created_at
    ) VALUES (
        new_user_id,
        p_email,
        p_device_id,
        p_device_name,
        p_device_fingerprint,
        p_invited_by,
        CASE WHEN p_invited_by IS NOT NULL THEN NOW() ELSE NULL END,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        device_id = EXCLUDED.device_id,
        device_name = EXCLUDED.device_name,
        device_fingerprint = EXCLUDED.device_fingerprint,
        updated_at = NOW();

    -- Create user progression
    INSERT INTO public.user_progression (user_id)
    VALUES (new_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Verify the cleanup worked
-- ============================================================================
SELECT 'Cleanup verification:' as status;
SELECT 'Profiles remaining:' as status, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'User progressions remaining:', COUNT(*) FROM public.user_progression;

-- You should see 0 profiles and 0 user progressions
-- ============================================================================
-- DONE! You can now close this and go back to the app
-- ============================================================================
