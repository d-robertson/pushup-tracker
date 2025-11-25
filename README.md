# Pushup Tracker PWA

A progressive web application to help users achieve 36,500 pushups in 2026 (100 pushups per day for 365 days).

## Overview

This is a **small, private challenge app** designed for up to 10 users who want to hold each other accountable for completing 100 pushups every day throughout 2026. The app features intelligent progression tracking that adapts to each user's actual performance and helps them get back on track if they fall behind.

### Key Features

- **Simple & Fast Entry**: Log your daily pushups in under 5 seconds
- **Smart Progression**: Adaptive algorithm adjusts your daily targets based on your performance
- **Achievement System**: Unlock 30+ badges across 7 categories (streaks, milestones, special achievements)
- **Smart Notifications**: Daily reminders, milestone celebrations, and streak tracking to keep you motivated
- **Offline-First**: Full functionality even without an internet connection
- **Private & Secure**: Invitation-only access with passwordless authentication
- **Progressive Web App**: Install on your phone and use like a native app
- **No Cost**: Runs entirely on free-tier services

## Documentation

- **[claude.md](./claude.md)** - Building principles and development rules
- **[TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md)** - Complete technical architecture and design decisions
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - 8-week phased implementation plan

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Radix UI
- **Backend**: Netlify Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Links)
- **Hosting**: Netlify (100% Free Tier)
- **Email**: Supabase SMTP / Resend (Free Tier)
- **Monitoring**: Sentry (Free Tier)

**All services operate on free tiers - $0/month cost.**

## Project Goals

1. **100 Pushups Daily**: Help users complete 100 pushups every day
2. **365 Days**: Full year commitment starting January 1, 2026
3. **36,500 Total**: Complete target across the year
4. **Adaptive**: Smart progression if users fall behind
5. **Zero Cost**: Completely free to operate

## Smart Progression Algorithm

The app uses an intelligent algorithm that adapts to your actual performance:

- **Standard Mode**: You're on track (hitting ~100/day)
- **Catch-up Mode**: You missed days but can make it up
- **Tapered Mode**: Gradually builds your capacity if you're consistently low
- **Injury Prevention**: Never recommends more than 200 pushups/day

Learn more in [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md#4-smart-progression-algorithm).

## Achievement System

Stay motivated with 30+ unlockable badges across 7 categories:

- **🏁 Milestone Badges**: Total pushup milestones (First Step, Thousand Club, Champion)
- **⭐ Streak Badges**: Consecutive day achievements (Week Warrior, Month Master, Year-Long Legend)
- **✨ Daily Achievement Badges**: Single-day accomplishments (Century Club, Beast Mode, Superhuman)
- **📅 Consistency Badges**: Pattern-based achievements (Never Miss Monday, Weekend Warrior)
- **🔄 Recovery Badges**: Bounce back from setbacks (Resilient, Second Wind)
- **🎆 Special Badges**: Rare and fun achievements (New Year's Hero, Early Bird, Perfect Score)
- **👥 Social Badges**: Group accomplishments (Team Player, Top Performer)

Each badge has:
- Progress tracking (see how close you are to unlocking)
- Rarity tiers (common, uncommon, rare, epic, legendary)
- Celebration animations on unlock
- Push notifications for major achievements

## Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase account (free tier)
- Netlify account (free tier)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd pushup-tracker

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Update .env.local with your Supabase credentials
```

### Environment Variables

Create a `.env.local` file with the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Netlify (set in Netlify dashboard)
SITE_URL=http://localhost:3000

# Optional: Email (if using Resend)
RESEND_API_KEY=your-resend-api-key

# Optional: Monitoring
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### Development

```bash
# Run development server
npm run dev

# Open http://localhost:3000
```

### Building

```bash
# Build for production
npm run build

# Run production build locally
npm start
```

## Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project (free tier)
3. Wait for database to provision

### 2. Run Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

Alternatively, copy the SQL from [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md#21-postgresql-schema-supabase) and run it in the Supabase SQL editor.

### 3. Set Up Auth

In your Supabase dashboard:

1. Go to Authentication > Settings
2. Enable Email provider
3. Configure email templates (optional)
4. Add your site URL to allowed redirect URLs

## Deployment

### Netlify Deployment

1. **Connect Repository**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli

   # Login to Netlify
   netlify login

   # Initialize site
   netlify init
   ```

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Functions directory: `netlify/functions`

3. **Set Environment Variables**
   - Go to Site settings > Environment variables
   - Add all variables from `.env.local`

4. **Deploy**
   ```bash
   # Manual deploy
   netlify deploy --prod

   # Or push to main branch for auto-deploy
   git push origin main
   ```

### Continuous Deployment

The app is configured for automatic deployment:

- Push to `develop` → Deploy to preview
- Push to `main` → Deploy to production

## Project Structure

```
/app                          # Next.js App Router
  /(auth)                     # Authentication routes
    /login                    # Login page
    /invite/[token]          # Invitation acceptance
  /(app)                      # Main application (protected)
    /dashboard                # User dashboard
    /today                    # Quick entry page
    /history                  # Historical entries
    /stats                    # Statistics and charts
    /settings                 # User settings
  /(admin)                    # Admin panel (admin only)
    /admin
      /users                  # User management
      /invitations            # Invitation management

/components                   # React components
  /ui                         # Base UI components (Radix)
  /features                   # Feature-specific components
    /pushup-entry             # Pushup entry form
    /progression-chart        # Progress visualization
    /stats-dashboard          # Statistics display
  /layouts                    # Layout components

/lib                          # Utility libraries
  /supabase                   # Supabase client setup
  /db                         # Database helper functions
  /calculations               # Progression algorithm
  /hooks                      # Custom React hooks
  /utils                      # General utilities

/netlify                      # Netlify configuration
  /functions                  # Serverless functions

/public                       # Static assets
  /icons                      # PWA icons
  manifest.json              # Web app manifest

/supabase                     # Supabase configuration
  /migrations                 # Database migrations

/types                        # TypeScript types
  database.types.ts          # Generated database types
  api.types.ts               # API types

/.github                      # GitHub configuration
  /workflows                  # CI/CD workflows
    ci.yml                   # Main CI pipeline
```

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check

# Run all quality checks
npm run check
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm run lint` - Lint code with ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript compiler
- `npm test` - Run all tests
- `npm run test:unit` - Run unit tests
- `npm run test:e2e` - Run E2E tests
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database (dev only)

## Development Guidelines

### Core Principles

1. **No Shortcuts**: Always implement the proper solution, even if it takes longer
2. **Test Everything**: Maintain 80%+ test coverage
3. **Type Safety**: Use TypeScript strict mode, no `any` types
4. **Accessibility**: WCAG 2.1 AA compliance minimum
5. **Performance**: Lighthouse score > 90 across all metrics
6. **Security**: Follow OWASP guidelines

### Git Workflow

1. Create feature branch from `develop`
2. Make changes with meaningful commits (conventional commits)
3. Write/update tests
4. Run quality checks (`npm run check`)
5. Create pull request to `develop`
6. Get code review approval
7. Merge to `develop`
8. Deploy to production via `main` branch

### Code Style

- Use TypeScript strict mode
- Follow ESLint and Prettier configuration
- Use functional components and hooks
- Implement proper error boundaries
- Use semantic HTML
- Write accessible markup

## API Documentation

### Authentication

#### Request Magic Link
```typescript
POST /api/auth/magic-link
{
  "email": "user@example.com"
}
```

#### Verify Invitation
```typescript
POST /api/auth/verify-invite
{
  "token": "invitation-token"
}
```

### Pushup Entries

#### Create Entry
```typescript
POST /api/pushups
{
  "date": "2026-01-15",
  "count": 100,
  "notes": "Felt strong today"
}
```

#### Get Entries
```typescript
GET /api/pushups?start_date=2026-01-01&end_date=2026-01-31
```

See [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md#3-api-design) for complete API documentation.

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors**
- Run `npm run type-check` to see all errors
- Check that all dependencies are installed
- Ensure TypeScript version is correct

**Supabase connection fails**
- Verify environment variables are set correctly
- Check that Supabase project is running
- Ensure RLS policies allow access

**PWA doesn't install**
- Check that app is served over HTTPS
- Verify manifest.json is valid
- Check console for service worker errors
- Ensure all required icons are present

**Offline mode not working**
- Check service worker registration
- Verify IndexedDB is working
- Check browser console for errors
- Ensure browser supports required APIs

## Performance

### Targets

- **Lighthouse Score**: > 90 (all categories)
- **First Contentful Paint**: < 1.5 seconds
- **Time to Interactive**: < 3.5 seconds
- **Bundle Size**: < 200KB (gzipped)

### Optimization Techniques

- Code splitting by route
- Image optimization with Next.js Image
- Font optimization and subsetting
- Service Worker caching
- Static generation where possible
- Dynamic imports for heavy components

## Security

- HTTPS only (enforced)
- Row Level Security (RLS) in database
- CSRF protection on mutations
- Rate limiting on all endpoints
- XSS protection (React auto-escaping + DOMPurify)
- Content Security Policy headers
- Secure session storage
- Regular dependency audits

Run security audit:
```bash
npm audit
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with PWA support

## Contributing

This is a private project for a small group. If you're part of the challenge:

1. Follow the development guidelines in [claude.md](./claude.md)
2. Create feature branches for any changes
3. Get approval before making major changes
4. Test thoroughly before deploying

## License

Private project - All rights reserved

## Support

For issues or questions:
1. Check the documentation files
2. Review the [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md)
3. Contact the project admin

## Timeline

- **Development Start**: December 2, 2025
- **Launch Date**: December 28, 2025
- **Challenge Start**: January 1, 2026
- **Challenge End**: December 31, 2026

## Success Metrics

- 90%+ user onboarding success
- 80%+ daily active usage
- < 5 second average entry time
- 50%+ users hit first week milestone
- 70%+ retention after 30 days

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend platform
- [Netlify](https://netlify.com/) - Hosting and deployment
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Radix UI](https://www.radix-ui.com/) - Accessible components

---

**Let's do this!** 36,500 pushups in 2026! 💪

---

*Last updated: November 25, 2025*
