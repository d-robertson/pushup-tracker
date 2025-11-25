-- Migration: Device-Based Authentication
-- Add device ID support and make email optional for device-only users

-- Add device-related columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN device_id TEXT UNIQUE,
  ADD COLUMN device_name TEXT,
  ADD COLUMN device_fingerprint TEXT,
  ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  ALTER COLUMN email DROP NOT NULL;

-- Create index for fast device lookups
CREATE INDEX idx_profiles_device_id ON public.profiles(device_id);

-- Add device columns to invitations table
ALTER TABLE public.invitations
  ADD COLUMN device_id TEXT,
  ADD COLUMN device_name TEXT;

-- Update RLS policy for profiles to allow device-based access
-- Users can view their own profile by device_id OR by auth.uid()
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR device_id = current_setting('app.current_device_id', true));

-- Allow profile creation with device_id
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to update last_seen_at on profile access
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_seen_at
CREATE TRIGGER update_profile_last_seen
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_last_seen();

-- Update the handle_new_user function to support device-based auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create profile if email exists (not for anonymous/device-only users)
    IF NEW.email IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, created_at)
        VALUES (NEW.id, NEW.email, NOW())
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.user_progression (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create device-based user
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
BEGIN
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

    -- Create profile
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
    );

    -- Create user progression
    INSERT INTO public.user_progression (user_id)
    VALUES (new_user_id);

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user by device ID
CREATE OR REPLACE FUNCTION get_user_by_device_id(p_device_id TEXT)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    device_name TEXT,
    is_admin BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.email,
        p.device_name,
        p.is_admin,
        p.created_at
    FROM public.profiles p
    WHERE p.device_id = p_device_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_device_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_device_id TO anon, authenticated;
