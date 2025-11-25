-- Cleanup script for device-based auth
-- Run this in Supabase SQL Editor to remove old auth data

-- Delete all existing profiles (they'll be recreated with device IDs)
DELETE FROM public.profiles;

-- Delete all existing user progressions (will be recreated)
DELETE FROM public.user_progression;

-- Delete all existing pushup entries (CAREFUL: This deletes user data!)
-- Uncomment the line below if you want to delete all pushup data too
-- DELETE FROM public.pushup_entries;

-- Note: We don't delete from auth.users because Supabase manages that table
-- Instead, you may need to manually delete users from the Supabase Auth dashboard
-- Go to: Authentication > Users > Delete each user

-- Verify cleanup
SELECT 'Profiles remaining:' as status, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'User progressions remaining:', COUNT(*) FROM public.user_progression
UNION ALL
SELECT 'Pushup entries remaining:', COUNT(*) FROM public.pushup_entries;
