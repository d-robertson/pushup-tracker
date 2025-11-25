-- Make the existing user an admin
UPDATE public.profiles
SET is_admin = true
WHERE id = '39e2c7ee-54a3-45cc-8aa3-2d3d1236198e';

-- Verify it worked
SELECT id, email, device_name, is_admin, created_at
FROM public.profiles
WHERE id = '39e2c7ee-54a3-45cc-8aa3-2d3d1236198e';

-- You should now see is_admin = true
