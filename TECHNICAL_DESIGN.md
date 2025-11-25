# Technical Design Document - Pushup Tracker PWA

## Project Constraints

**User Scale**: Maximum 10 users
**Budget**: $0/month (100% free tier services)
**Timeline**: 8 weeks to launch (by December 28, 2025)
**Quality**: No shortcuts - proper implementation over speed

This application is designed to operate entirely on free tiers of services. With only 10 users, we have generous margins on all free tier limits. All architectural decisions factor in free tier constraints while maintaining production-quality standards.

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Next.js PWA (React + TypeScript)            │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │ Service     │  │  IndexedDB   │  │  UI Layer   │  │  │
│  │  │ Worker      │  │  (Offline)   │  │  (Radix UI) │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                      Netlify Layer                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Netlify Edge Functions                     │ │
│  │  (Caching, Routing, Rate Limiting)                     │ │
│  └────────────────────┬───────────────────────────────────┘ │
│  ┌────────────────────┴───────────────────────────────────┐ │
│  │          Netlify Serverless Functions (API)            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │ │
│  │  │  Auth API    │  │  Pushup API  │  │  Admin API  │  │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                    Supabase Layer                            │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   PostgreSQL    │  │  Auth Service│  │  Realtime     │  │
│  │   Database      │  │  (Magic Link)│  │  Subscriptions│  │
│  └─────────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                  External Services                           │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  SendGrid/      │  │    Sentry    │  │   Plausible   │  │
│  │  Resend (Email) │  │    (Errors)  │  │  (Analytics)  │  │
│  └─────────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Offline-First Architecture

- **Service Worker**: Caches static assets and API responses
- **IndexedDB**: Local storage for pushup entries and user data
- **Background Sync**: Syncs data when connection is restored
- **Conflict Resolution**: Last-write-wins with timestamp comparison

## 2. Database Schema

### 2.1 PostgreSQL Schema (Supabase)

```sql
-- Users table (extended from Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    invited_by UUID REFERENCES public.profiles(id),
    invited_at TIMESTAMPTZ,
    onboarded_at TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations table
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES public.profiles(id),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pushup entries table
CREATE TABLE public.pushup_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    count INTEGER NOT NULL CHECK (count >= 0 AND count <= 1000),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one entry per user per day
    UNIQUE(user_id, entry_date)
);

-- User progression settings
CREATE TABLE public.user_progression (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT '2026-01-01',
    target_total INTEGER NOT NULL DEFAULT 36500,
    daily_target INTEGER NOT NULL DEFAULT 100,
    use_adaptive_progression BOOLEAN DEFAULT TRUE,
    current_weekly_target INTEGER,
    progression_mode TEXT CHECK (progression_mode IN ('standard', 'tapered', 'catch_up')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progression snapshots (for historical tracking)
CREATE TABLE public.progression_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_completed INTEGER NOT NULL,
    seven_day_average NUMERIC(5,2),
    days_remaining INTEGER,
    adjusted_daily_target INTEGER,
    on_track BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, snapshot_date)
);

-- Achievement definitions (populated with seed data)
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL, -- e.g., 'first_step', 'week_warrior'
    name TEXT NOT NULL, -- e.g., 'First Step'
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('milestone', 'streak', 'daily', 'consistency', 'recovery', 'special', 'social')),
    icon_emoji TEXT, -- e.g., '🏁'
    criteria JSONB NOT NULL, -- Flexible criteria definition
    rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    points INTEGER DEFAULT 0, -- Optional point system
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements (earned badges)
CREATE TABLE public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    progress INTEGER DEFAULT 100, -- Percentage toward unlocking (100 = unlocked)

    UNIQUE(user_id, achievement_id)
);

-- Indexes for performance
CREATE INDEX idx_pushup_entries_user_date ON public.pushup_entries(user_id, entry_date DESC);
CREATE INDEX idx_pushup_entries_date ON public.pushup_entries(entry_date);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_progression_snapshots_user_date ON public.progression_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_achievements_category ON public.achievements(category);
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned_at ON public.user_achievements(user_id, earned_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pushup_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles but only update their own
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Pushup entries: Users can only access their own entries
CREATE POLICY "Users can view own pushup entries" ON public.pushup_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pushup entries" ON public.pushup_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pushup entries" ON public.pushup_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pushup entries" ON public.pushup_entries
    FOR DELETE USING (auth.uid() = user_id);

-- User progression: Users can only access their own progression
CREATE POLICY "Users can view own progression" ON public.user_progression
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progression" ON public.user_progression
    FOR UPDATE USING (auth.uid() = user_id);

-- Progression snapshots: Users can only access their own snapshots
CREATE POLICY "Users can view own snapshots" ON public.progression_snapshots
    FOR SELECT USING (auth.uid() = user_id);

-- Invitations: Only admins can manage invitations
CREATE POLICY "Admins can manage invitations" ON public.invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Achievements: All users can view achievement definitions
CREATE POLICY "Users can view achievements" ON public.achievements
    FOR SELECT USING (true);

-- User achievements: Users can only view their own earned badges
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert achievements (via triggers/functions)
CREATE POLICY "System can insert achievements" ON public.user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions and Triggers

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pushup_entries_updated_at
    BEFORE UPDATE ON public.pushup_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progression_updated_at
    BEFORE UPDATE ON public.user_progression
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate user statistics
CREATE OR REPLACE FUNCTION calculate_user_stats(user_uuid UUID)
RETURNS TABLE (
    total_pushups BIGINT,
    seven_day_average NUMERIC,
    current_streak INTEGER,
    longest_streak INTEGER,
    days_active INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_counts AS (
        SELECT entry_date, count
        FROM public.pushup_entries
        WHERE user_id = user_uuid
        ORDER BY entry_date DESC
    ),
    streak_calc AS (
        SELECT
            entry_date,
            entry_date - (ROW_NUMBER() OVER (ORDER BY entry_date))::INTEGER AS streak_group
        FROM daily_counts
        WHERE count >= 100
    )
    SELECT
        COALESCE(SUM(pe.count), 0)::BIGINT as total_pushups,
        COALESCE(AVG(pe.count) FILTER (
            WHERE pe.entry_date >= CURRENT_DATE - INTERVAL '7 days'
        ), 0)::NUMERIC as seven_day_average,
        COALESCE(MAX(streak_length) FILTER (
            WHERE streak_group = (
                SELECT streak_group
                FROM streak_calc
                WHERE entry_date = CURRENT_DATE
            )
        ), 0)::INTEGER as current_streak,
        COALESCE(MAX(streak_length), 0)::INTEGER as longest_streak,
        COUNT(DISTINCT pe.entry_date)::INTEGER as days_active
    FROM public.pushup_entries pe
    LEFT JOIN (
        SELECT streak_group, COUNT(*) as streak_length
        FROM streak_calc
        GROUP BY streak_group
    ) streaks ON true
    WHERE pe.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;
```

## 3. API Design

### 3.1 API Endpoints

#### Authentication
- `POST /api/auth/invite` - Admin sends invitation (Admin only)
- `POST /api/auth/verify-invite` - Verify invitation token
- `POST /api/auth/magic-link` - Request magic link (via Supabase)
- `GET /api/auth/callback` - Handle magic link callback

#### Pushup Entries
- `GET /api/pushups` - Get user's pushup entries (with date range)
- `GET /api/pushups/[date]` - Get specific day's entry
- `POST /api/pushups` - Create new pushup entry
- `PUT /api/pushups/[date]` - Update pushup entry
- `DELETE /api/pushups/[date]` - Delete pushup entry

#### Progression
- `GET /api/progression/current` - Get current progression status
- `GET /api/progression/calculate` - Calculate adjusted targets
- `GET /api/progression/history` - Get historical progression snapshots
- `POST /api/progression/snapshot` - Create progression snapshot

#### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/stats` - Get user statistics

#### Achievements
- `GET /api/achievements` - Get all achievement definitions
- `GET /api/achievements/user` - Get user's earned achievements
- `GET /api/achievements/user/progress` - Get progress toward locked achievements
- `POST /api/achievements/check` - Check and award any newly earned achievements (called after entry)

#### Admin
- `GET /api/admin/users` - List all users (Admin only)
- `GET /api/admin/invitations` - List all invitations (Admin only)
- `DELETE /api/admin/invitations/[id]` - Revoke invitation (Admin only)

### 3.2 API Request/Response Examples

#### POST /api/pushups
```typescript
// Request
{
  "date": "2026-01-15",
  "count": 85,
  "notes": "Felt good today"
}

// Response (201 Created)
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2026-01-15",
  "count": 85,
  "notes": "Felt good today",
  "createdAt": "2026-01-15T14:30:00Z",
  "updatedAt": "2026-01-15T14:30:00Z"
}

// Error Response (400 Bad Request)
{
  "error": "INVALID_COUNT",
  "message": "Count must be between 0 and 1000",
  "details": {
    "field": "count",
    "value": -5
  }
}
```

#### GET /api/progression/current
```typescript
// Response (200 OK)
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "startDate": "2026-01-01",
  "targetTotal": 36500,
  "totalCompleted": 1450,
  "remainingPushups": 35050,
  "daysElapsed": 15,
  "daysRemaining": 350,
  "dailyTargetOriginal": 100,
  "dailyTargetAdjusted": 100,
  "sevenDayAverage": 96.7,
  "progressionMode": "standard",
  "onTrack": true,
  "currentStreak": 12,
  "longestStreak": 12,
  "projectedCompletion": "2026-12-31",
  "weeklyMilestone": {
    "week": 3,
    "target": 2100,
    "completed": 1450,
    "remaining": 650
  }
}
```

## 4. Smart Progression Algorithm

### 4.1 Algorithm Pseudocode

```typescript
interface ProgressionCalculation {
  dailyTarget: number;
  weeklyTarget: number;
  mode: 'standard' | 'tapered' | 'catch_up';
  reasoning: string;
}

function calculateProgression(
  userId: string,
  startDate: Date,
  targetTotal: number = 36500,
  currentDate: Date = new Date()
): ProgressionCalculation {
  // Get user's historical data
  const entries = getUserEntries(userId, startDate, currentDate);
  const totalCompleted = sum(entries.map(e => e.count));

  const daysElapsed = daysBetween(startDate, currentDate);
  const daysRemaining = 365 - daysElapsed;
  const remainingPushups = targetTotal - totalCompleted;

  // Calculate 7-day average
  const recentEntries = entries.slice(-7);
  const sevenDayAvg = average(recentEntries.map(e => e.count));
  const sevenDayTotal = sum(recentEntries.map(e => e.count));

  // Calculate what's needed to stay on track
  const catchUpDaily = Math.ceil(remainingPushups / daysRemaining);

  // Determine progression mode

  // Mode 1: Standard (user is on track)
  if (sevenDayAvg >= 95 && catchUpDaily <= 105) {
    return {
      dailyTarget: 100,
      weeklyTarget: 700,
      mode: 'standard',
      reasoning: 'On track with original goal'
    };
  }

  // Mode 2: Catch-up (user missed some days but capable)
  if (sevenDayAvg >= 80 && catchUpDaily <= 150) {
    return {
      dailyTarget: catchUpDaily,
      weeklyTarget: catchUpDaily * 7,
      mode: 'catch_up',
      reasoning: `Need ${catchUpDaily}/day to get back on track`
    };
  }

  // Mode 3: Tapered progression (user needs gradual increase)
  if (sevenDayAvg < 80) {
    return calculateTaperedProgression(
      sevenDayAvg,
      daysRemaining,
      remainingPushups
    );
  }

  // Mode 4: Realistic adjustment (catch-up not feasible)
  if (catchUpDaily > 200) {
    return {
      dailyTarget: 200,
      weeklyTarget: 1400,
      mode: 'catch_up',
      reasoning: 'Capped at 200/day for injury prevention. Target may not be fully achievable.'
    };
  }
}

function calculateTaperedProgression(
  currentAvg: number,
  daysRemaining: number,
  remainingPushups: number
): ProgressionCalculation {
  const weeksRemaining = Math.floor(daysRemaining / 7);
  const targetDailyEnd = Math.min(200, remainingPushups / daysRemaining * 1.2);

  // Calculate weekly progression rate
  // We want to progress from currentAvg to targetDailyEnd over weeksRemaining
  const weeklyIncrease = (targetDailyEnd - currentAvg) / weeksRemaining;

  // Current week's target
  const thisWeekTarget = Math.ceil(currentAvg + weeklyIncrease);

  return {
    dailyTarget: thisWeekTarget,
    weeklyTarget: thisWeekTarget * 7,
    mode: 'tapered',
    reasoning: `Building from ${Math.round(currentAvg)}/day to ${Math.round(targetDailyEnd)}/day over ${weeksRemaining} weeks (+${Math.round(weeklyIncrease)}/week)`
  };
}
```

### 4.2 Progression Modes Explained

1. **Standard Mode** (100/day)
   - User is hitting ~100 pushups consistently
   - No adjustment needed

2. **Catch-up Mode** (Dynamic target)
   - User missed some days but capable of higher volume
   - Calculates: (Total Remaining) / (Days Remaining)
   - Capped at 200/day for safety

3. **Tapered Mode** (Progressive overload)
   - User consistently below 80/day average
   - Gradually increases weekly target
   - Aims to build capacity over time
   - More realistic for achieving total goal

4. **Injury Prevention Mode**
   - Never recommends > 200 pushups/day
   - Warns user if goal becoming unattainable

## 5. Frontend Architecture

### 5.1 Application Structure

```
/app
  /(auth)
    /login
    /invite/[token]
  /(app)
    /dashboard
    /today
    /history
    /stats
    /settings
  /(admin)
    /admin
      /users
      /invitations
/components
  /ui (Radix UI primitives)
  /features
    /pushup-entry
    /progression-chart
    /stats-dashboard
  /layouts
/lib
  /supabase (client)
  /db (database helpers)
  /calculations (progression algorithm)
  /hooks
  /utils
/types
  /database.types.ts
  /api.types.ts
```

### 5.2 Key Components

#### PushupEntryForm
```typescript
interface PushupEntryFormProps {
  date: Date;
  initialCount?: number;
  onSuccess: (entry: PushupEntry) => void;
}

// Features:
// - Quick number input (optimized for mobile)
// - Increment/decrement buttons
// - Optional notes
// - Optimistic UI updates
// - Offline support with sync
```

#### ProgressionDashboard
```typescript
interface ProgressionDashboardProps {
  userId: string;
}

// Features:
// - Current daily target (large, prominent)
// - Progress bar (daily and total)
// - 7-day trend chart
// - Current streak display
// - Next milestone
// - Motivational messaging
```

#### StatsChart
```typescript
interface StatsChartProps {
  data: PushupEntry[];
  dateRange: DateRange;
  chartType: 'line' | 'bar' | 'calendar';
}

// Features:
// - Interactive charts using recharts or chart.js
// - Date range selector
// - Multiple visualization types
// - Export data option
```

### 5.3 State Management

```typescript
// Zustand store for global app state
interface AppState {
  user: User | null;
  progression: ProgressionData | null;
  entries: PushupEntry[];
  syncStatus: 'synced' | 'pending' | 'offline';

  // Actions
  setUser: (user: User) => void;
  addEntry: (entry: PushupEntry) => void;
  updateEntry: (id: string, entry: Partial<PushupEntry>) => void;
  refreshProgression: () => Promise<void>;
  sync: () => Promise<void>;
}

// Local-first with optimistic updates
// All mutations go to IndexedDB first
// Background sync to Supabase
// Conflict resolution on sync
```

## 6. PWA Implementation

### 6.1 Service Worker Strategy

```typescript
// next.config.js with next-pwa
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
    {
      urlPattern: /^https?.*\.(png|jpg|jpeg|svg|gif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
});
```

### 6.2 Offline Support

- **IndexedDB Schema**: Mirror of Supabase tables for offline access
- **Sync Queue**: Queue mutations when offline, replay on reconnect
- **Conflict Resolution**: Timestamp-based last-write-wins
- **Offline Indicator**: Clear UI feedback when offline
- **Background Sync API**: Sync data when connection restored

### 6.3 Web App Manifest

```json
{
  "name": "Pushup Tracker - 100 Pushups Challenge",
  "short_name": "Pushup Tracker",
  "description": "Track your journey to 36,500 pushups in 2026",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Add Today's Pushups",
      "short_name": "Add Pushups",
      "description": "Quickly log today's pushups",
      "url": "/today",
      "icons": [{ "src": "/icons/add-icon.png", "sizes": "96x96" }]
    }
  ]
}
```

## 7. Security Implementation

### 7.1 Authentication Flow

1. **Invitation Flow**:
   - Admin generates unique invite token
   - Email sent with magic link containing token
   - User clicks link → token validated → Supabase magic link sent
   - User clicks magic link → authenticated → profile created
   - Token marked as used

2. **Returning User**:
   - PWA cached on device
   - Supabase session persisted in localStorage
   - Auto-refresh of session token
   - Biometric unlock (via Web Authentication API) - Phase 2

### 7.2 Security Measures

- HTTPS only (enforced by Netlify)
- CSRF tokens on all mutations
- Rate limiting on all API endpoints (via Netlify Edge)
- SQL injection protection (via Supabase parameterized queries)
- XSS protection (React auto-escaping + DOMPurify for notes)
- Content Security Policy headers
- Supabase Row Level Security (RLS)
- Secure session storage
- Token expiration and rotation

### 7.3 Rate Limiting

```typescript
// Netlify Edge Function for rate limiting
import { RateLimiter } from './rate-limiter';

const limiter = new RateLimiter({
  '/api/auth/invite': { maxRequests: 10, window: '1h' },
  '/api/pushups': { maxRequests: 100, window: '15m' },
  '/api/progression': { maxRequests: 50, window: '15m' },
});

export default async (request: Request, context: Context) => {
  const userId = context.params.userId;
  const isAllowed = await limiter.check(userId, request.url);

  if (!isAllowed) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  return context.next();
};
```

## 8. Testing Strategy

### 8.1 Test Coverage

- **Unit Tests** (Vitest): 80%+ coverage
  - Utility functions
  - Progression calculation algorithm
  - Data transformation functions
  - React hooks

- **Component Tests** (React Testing Library): Critical components
  - PushupEntryForm
  - ProgressionDashboard
  - AuthFlow components

- **Integration Tests**: API endpoints
  - All CRUD operations
  - Authentication flows
  - Progression calculations

- **E2E Tests** (Playwright): Critical user journeys
  - Invitation and onboarding
  - Adding daily pushups
  - Viewing progression
  - Offline functionality

### 8.2 Test Examples

```typescript
// Unit test: Progression algorithm
describe('calculateProgression', () => {
  it('should return standard mode when user is on track', () => {
    const result = calculateProgression({
      userId: 'test-user',
      startDate: new Date('2026-01-01'),
      currentDate: new Date('2026-01-15'),
      entries: generateEntries(15, 100), // 15 days of 100 pushups
    });

    expect(result.mode).toBe('standard');
    expect(result.dailyTarget).toBe(100);
  });

  it('should return tapered mode when user is consistently low', () => {
    const result = calculateProgression({
      userId: 'test-user',
      startDate: new Date('2026-01-01'),
      currentDate: new Date('2026-01-15'),
      entries: generateEntries(15, 40), // 15 days of 40 pushups
    });

    expect(result.mode).toBe('tapered');
    expect(result.dailyTarget).toBeGreaterThan(40);
    expect(result.dailyTarget).toBeLessThanOrEqual(50);
  });
});

// E2E test: Add pushup entry
test('user can add pushups for today', async ({ page }) => {
  await page.goto('/today');

  await page.fill('[data-testid="pushup-count"]', '85');
  await page.fill('[data-testid="pushup-notes"]', 'Felt strong');
  await page.click('[data-testid="submit-entry"]');

  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  await expect(page.locator('[data-testid="total-today"]')).toHaveText('85');
});
```

## 9. Performance Optimization

### 9.1 Bundle Optimization

- Code splitting by route
- Dynamic imports for heavy components (charts)
- Tree shaking of unused code
- Image optimization with Next.js Image component
- Font optimization (subset, preload)

### 9.2 Runtime Optimization

- React Server Components for initial render
- Streaming SSR for faster TTFB
- Optimistic UI updates
- Debounced API calls
- Memoization of expensive calculations
- Virtual scrolling for long lists

### 9.3 Caching Strategy

- Static assets: 1 year cache
- API responses: 5 minute cache
- User data: Cache-first with background refresh
- Service Worker cache for offline access

## 10. Monitoring & Observability

### 10.1 Error Tracking (Sentry)

- Frontend errors
- API errors
- User session tracking
- Performance monitoring
- Release tracking

### 10.2 Analytics (Plausible)

- Page views
- User engagement
- Feature usage
- Conversion funnels (onboarding)
- Privacy-focused (no cookies)

### 10.3 Performance Monitoring

- Core Web Vitals
- API response times
- Database query performance
- Build times
- Lighthouse CI on every deploy

## 11. Deployment Strategy

### 11.1 CI/CD Pipeline (Netlify + GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:unit
      - run: npm run test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://deploy-preview-${{ github.event.number }}--pushup-tracker.netlify.app
          uploadArtifacts: true
```

### 11.2 Environment Strategy

- **Development**: Auto-deploy from `develop` branch
- **Staging**: Auto-deploy from `main` branch (preview environment)
- **Production**: Manual promotion from staging

### 11.3 Database Migrations

- Use Supabase migrations
- Version controlled in `/supabase/migrations`
- Auto-run on deploy via Supabase CLI
- Rollback capability

## 12. Future Considerations

### 12.1 Scalability

- Current architecture handles 1,000+ users
- Database indexes optimized for read-heavy workload
- Can add read replicas if needed
- CDN for static assets

### 12.2 Feature Flags

- Use environment variables for feature toggling
- A/B testing capability
- Gradual rollout of new features

### 12.3 Multi-tenancy

- Architecture supports multiple challenges
- Can add `challenge_id` to tables
- Invite users to specific challenges

### 12.4 AI-Powered Pushup Counter (Computer Vision)

**Feature**: Automatic pushup counting using device camera and pose detection

**Potential Implementation**:

#### Technology Options

1. **TensorFlow.js + PoseNet/MoveNet**
   - Runs entirely in browser (privacy-friendly)
   - Real-time pose detection
   - ~2MB model size (acceptable for PWA)
   - Free to use

2. **MediaPipe Pose (Google)**
   - More accurate than PoseNet
   - WebAssembly implementation for web
   - Good performance on mobile
   - Free to use

3. **ML5.js** (wrapper around TensorFlow.js)
   - Simpler API for developers
   - Good for prototyping
   - Built on PoseNet

#### Implementation Approach

```typescript
// Pseudocode for pushup counter
interface PosePoint {
  x: number;
  y: number;
  confidence: number;
}

interface PushupDetector {
  // Key points: shoulders, elbows, hips, knees
  keyPoints: Map<string, PosePoint>;

  // State machine for counting
  state: 'ready' | 'down' | 'up';
  count: number;

  // Detect if user is in correct position
  isValidStartPosition(): boolean;

  // Detect downward motion
  isInDownPosition(): boolean;

  // Detect upward motion
  isInUpPosition(): boolean;

  // Increment count when full rep completed
  detectPushup(): void;
}
```

#### Features

- **Real-time Counting**: Count pushups as user performs them
- **Form Feedback**: Visual indicators for proper form
  - Shoulders, hips, knees alignment
  - Depth of pushup (chest to ground)
  - Full range of motion
- **Camera Overlay**: Show skeleton/pose overlay on video
- **Manual Override**: User can adjust count if detection is off
- **Privacy**: All processing on-device, no video uploaded

#### Technical Considerations

**Pros**:
- Hands-free counting
- Encourages proper form
- Fun and engaging
- All processing local (privacy)

**Cons**:
- Adds ~2-5MB to bundle (model weight)
- Requires camera permission
- Computationally intensive (battery drain)
- May not work well in low light
- Accuracy varies by camera quality
- Difficult to get 100% accuracy

**Implementation Complexity**: Medium-High
- Requires ML expertise
- Calibration needed for different body types
- Testing on various devices
- Edge cases (partial reps, pausing mid-rep)

#### MVP Approach

For initial implementation:
1. Basic pose detection with PoseNet
2. Simple angle-based detection (elbow angle)
3. Count when angle goes below threshold and back up
4. Manual adjustment always available
5. Beta feature flag initially

#### Free Tier Compatibility

All computer vision runs client-side:
- No server processing needed
- No additional API costs
- Model loaded from CDN (cached)
- Fits within bandwidth limits

#### Development Timeline Estimate

- Research & prototyping: 1 week
- Core implementation: 2 weeks
- Calibration & testing: 1 week
- Polish & UX: 1 week
- **Total**: 5 weeks

**Recommendation**: Implement as Phase 9 (post-MVP) enhancement after core app is stable and users have requested it.

---

*This technical design is a living document and will be updated as the project evolves.*
