# Device-Based Authentication Plan

## Overview
Replace email/password auth with device-based authentication for a frictionless PWA experience. Users are automatically authenticated based on their device ID and never need to login/logout.

## Core Principles
1. **Always Authenticated**: Once set up, users stay logged in forever on their device
2. **Device ID as Identity**: Each device gets a unique ID that serves as authentication
3. **No Login UI for Regular Users**: Only admin might need to login
4. **Invitation-Only**: Users must be invited to activate their device

## Authentication Architecture

### Device ID Generation
```typescript
// Generate unique device ID combining:
1. Browser fingerprint (canvas, WebGL, fonts, etc.)
2. Random UUID (crypto.randomUUID())
3. Timestamp

// Store in multiple places for persistence:
- localStorage: 'device_id'
- IndexedDB: 'auth.device_id'
- In-memory: authContext state
```

### Database Schema Changes

```sql
-- Update profiles table
ALTER TABLE public.profiles
  ADD COLUMN device_id TEXT UNIQUE,
  ADD COLUMN device_name TEXT, -- e.g., "iPhone 13", "Chrome on Mac"
  ADD COLUMN device_fingerprint TEXT,
  ADD COLUMN last_seen_at TIMESTAMPTZ,
  ALTER COLUMN email DROP NOT NULL; -- Email optional for device-only users

-- Index for fast device lookups
CREATE INDEX idx_profiles_device_id ON public.profiles(device_id);

-- Invitations: associate with device after acceptance
ALTER TABLE public.invitations
  ADD COLUMN device_id TEXT,
  ADD COLUMN device_name TEXT;
```

## User Flows

### Flow 1: First-Time User (With Invitation)
```
1. User clicks invitation link: /invite/[token]
2. App generates device ID
3. App validates invitation token
4. Creates profile with:
   - device_id
   - email (from invitation)
   - invited_by (from invitation)
5. Marks invitation as used
6. Stores device_id in localStorage
7. Auto-authenticates user
8. Redirects to onboarding → dashboard
9. User is now permanently logged in on this device
```

### Flow 2: First-Time User (No Invitation)
```
1. User opens app directly (no invitation)
2. App generates device ID
3. App checks if device_id exists in database
4. Not found → Show "Waiting for Invitation" screen
5. Screen explains they need an invitation to access
6. Shows contact info or request access button
```

### Flow 3: Returning User
```
1. User opens PWA
2. App reads device_id from localStorage
3. App authenticates with Supabase using device_id
4. Fetches user profile
5. Updates last_seen_at
6. Goes straight to dashboard
7. No login screen shown
```

### Flow 4: Admin First Setup
```
1. Admin opens app on their device
2. Visits special route: /admin/setup
3. Enters their email (optional)
4. Creates profile with:
   - device_id
   - is_admin: true
   - email (if provided)
5. Now has access to /admin routes
6. Can invite other users
7. Also stays logged in forever via device_id
```

### Flow 5: Admin on New Device
```
1. Admin opens app on a new device
2. Visits /admin/login
3. Uses magic link to authenticate email
4. Associates new device_id with existing admin account
5. Creates new profile entry for this device (or adds to devices array)
6. Now logged in on this device too
```

## Implementation Details

### 1. Device ID Service
```typescript
// lib/auth/device-id.ts
export class DeviceIdService {
  // Generate browser fingerprint
  static async generateFingerprint(): Promise<string>

  // Generate unique device ID
  static async generateDeviceId(): Promise<string>

  // Get stored device ID
  static getDeviceId(): string | null

  // Store device ID
  static async setDeviceId(id: string): Promise<void>

  // Clear device ID (for testing/logout)
  static clearDeviceId(): void

  // Get device info (name, OS, browser)
  static getDeviceInfo(): { name: string; os: string; browser: string }
}
```

### 2. Updated Auth Context
```typescript
// lib/auth/auth-context.tsx
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  deviceId: string | null;
  loading: boolean;
  isAdmin: boolean;
  // Removed: signOut (users don't sign out)
  // Added: refreshProfile, switchDevice (for admin)
}
```

### 3. Authentication Flow
```typescript
// On app load:
1. Check localStorage for device_id
2. If exists:
   - Authenticate with Supabase using device_id
   - Fetch profile
   - Update last_seen_at
   - Set authenticated state
3. If not exists:
   - Generate new device_id
   - Store in localStorage
   - Check if we're on an invitation page
   - If yes: complete invitation flow
   - If no: show "waiting for invitation"
```

### 4. Supabase Custom Auth
Since Supabase doesn't natively support device-based auth, we have two options:

**Option A: Use Anonymous Auth + Device ID**
```typescript
// Create anonymous user
const { data, error } = await supabase.auth.signInAnonymously();

// Store device_id in profiles table
await supabase.from('profiles').insert({
  id: data.user.id,
  device_id: deviceId,
  device_name: deviceName,
});
```

**Option B: Use Magic Links But Auto-Generated**
```typescript
// Generate a unique email per device
const deviceEmail = `device-${deviceId}@pushup-tracker.local`;

// Create user with that email (no actual email sent)
await supabase.auth.signUp({
  email: deviceEmail,
  password: deviceId, // Use device_id as password
});

// Store device_id in profiles
```

**Recommendation: Option A** - Cleaner, uses Supabase's anonymous auth feature

### 5. Invitation System
```typescript
// Admin creates invitation
1. Admin enters: email, optional: name
2. System creates invitation with token
3. Email sent with link: https://app.com/invite/[token]

// User accepts invitation
1. User clicks link (opens app)
2. App generates device_id
3. App validates token
4. Creates anonymous Supabase user
5. Creates profile with:
   - device_id
   - email (from invitation)
   - invited_by
   - invited_at
6. Marks invitation as used
7. User is now authenticated
```

### 6. Admin Authentication
```typescript
// Admin setup (first time)
1. Visit /admin/setup
2. No authentication required (first admin)
3. Create profile with is_admin: true

// Admin on new device
1. Visit /admin/login
2. Use magic link with real email
3. Associate new device_id with admin profile
4. Mark device as admin device
```

## Security Considerations

### 1. Device ID Theft Prevention
- Device ID alone shouldn't grant access
- Combine with browser fingerprint verification
- Track suspicious changes (IP, user agent)
- Allow admin to revoke devices

### 2. Invitation Token Security
- Tokens expire after 7 days
- Single use only
- Cryptographically secure random tokens
- Can be revoked by admin

### 3. Admin Protection
- Admin routes require is_admin flag
- Admin can have multiple devices
- Each device independently authenticated
- Can revoke individual devices

### 4. Device Switching/Loss
- User can't move to new device without new invitation
- If device lost: admin can revoke device_id
- User gets new invitation for new device
- Old device data can be transferred or archived

## Migration Plan

### Phase 1: Update Database Schema
- Add device_id to profiles table
- Update invitations table
- Create indexes
- Update RLS policies

### Phase 2: Implement Device ID Service
- Generate and store device IDs
- Browser fingerprinting
- Device info detection

### Phase 3: Update Auth Context
- Remove email-based auth for users
- Add device-based auth
- Update AuthProvider

### Phase 4: Update UI
- Remove login page for regular users
- Add "waiting for invitation" screen
- Update invitation acceptance flow
- Add admin setup page

### Phase 5: Update Invitation System
- Link invitations to device IDs
- Update email templates
- Add invitation validation

### Phase 6: Admin Features
- Admin setup flow
- Multi-device admin support
- Device management UI

## User Experience

### Regular User Journey
```
Day 1:
- Receives email invitation
- Clicks link → App opens
- Sees welcome screen
- Accepts invitation (one tap)
- Goes to dashboard
- Adds first pushups

Day 2-365:
- Opens PWA from home screen
- Instantly at dashboard
- No login, no friction
- Just track pushups
```

### Admin Journey
```
Day 1:
- Opens app for first time
- Goes to /admin/setup
- Becomes admin
- Starts inviting friends

Ongoing:
- Opens PWA → straight to dashboard
- Can access admin panel anytime
- Invite more users
- View all user progress
```

## Benefits

1. **Zero Friction**: Users never think about authentication
2. **PWA Perfect**: Works offline, always authenticated
3. **Secure**: Device-based + invitation-only
4. **Simple**: No passwords, no emails (for users)
5. **Private**: Only invited users can access
6. **Admin Control**: Full control over who has access

## Open Questions

1. **What happens if user clears browser data?**
   - Option A: They need a new invitation
   - Option B: Admin can "recover" their account to new device
   - Recommendation: B with admin approval

2. **Should we store email for regular users?**
   - Yes: Useful for admin to identify users, send updates
   - Store in invitation, copy to profile
   - But never used for authentication

3. **Multiple devices per user?**
   - For 10-person challenge: probably not needed
   - Could add later if requested
   - Each device would need separate invitation

4. **How to handle PWA reinstall on same device?**
   - Device ID regenerates → looks like new device
   - Need to detect and handle this
   - Could use combination of fingerprint + stored backup ID

## Next Steps

1. Review and approve this plan
2. Update database schema
3. Implement DeviceIdService
4. Update auth context
5. Build invitation acceptance flow
6. Test thoroughly
7. Migration from current auth

---

This approach gives us the frictionless PWA experience you want while maintaining security and admin control. Users literally never think about authentication after the first tap!
