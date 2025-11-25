# Claude.md - Pushup Tracker PWA Build Guide

## Project Overview
A progressive web application for tracking daily pushups with a goal of helping users complete 100 pushups per day for 365 days (36,500 total pushups in 2026).

## Core Building Principles

### Rule #1: Always Code the Proper Way
**We NEVER cut corners or take shortcuts. Even if the proper way is difficult and takes longer, we choose that path.**

This means:
- Write clean, maintainable, well-documented code
- Follow best practices and design patterns
- Implement proper error handling and edge cases
- Write comprehensive tests (unit, integration, e2e)
- Use proper TypeScript types (no `any` types unless absolutely necessary)
- Implement proper security measures
- Follow accessibility guidelines (WCAG 2.1 AA minimum)
- Use proper state management patterns
- Implement proper logging and monitoring
- Follow semantic versioning and proper git workflows

### Rule #2: Security First
- All authentication must be secure and follow industry standards
- Implement proper CSRF protection
- Sanitize all user inputs
- Use environment variables for all secrets
- Implement rate limiting on all API endpoints
- Follow OWASP security guidelines
- Regular security audits of dependencies

### Rule #3: User Experience is Paramount
- Fast load times (< 3 seconds on 3G)
- Intuitive UI/UX
- Offline-first architecture
- Smooth animations and transitions
- Clear error messages and feedback
- Accessibility for all users

### Rule #4: Data Integrity
- Validate all data on both client and server
- Implement proper database migrations
- Regular backups
- Atomic transactions where needed
- No data loss scenarios

### Rule #5: Performance Matters
- Optimize bundle size
- Implement code splitting
- Use proper caching strategies
- Lazy load non-critical resources
- Monitor and optimize Core Web Vitals

### Rule #6: Maintainability
- Write self-documenting code
- Maintain comprehensive documentation
- Use consistent code style (enforced by linters)
- Keep dependencies up to date
- Modular, reusable components
- Clear separation of concerns

### Rule #7: Testing is Non-Negotiable
- Write tests before or alongside features
- Maintain high test coverage (>80%)
- Test edge cases and error scenarios
- Integration tests for critical flows
- E2E tests for user journeys

### Rule #8: Local Development Transparency
- Always run development servers locally on the developer's machine
- Never abstract away the server process during development
- Developers should see and understand all output, logs, and errors
- This ensures full understanding of what's happening under the hood
- Use `npm run dev` or similar commands that show real-time output
- Debug and troubleshoot with full visibility into the process

## Project Rules

### Git Workflow
- Feature branch workflow
- Meaningful commit messages following conventional commits
- Code review required before merge
- CI/CD pipeline must pass before merge
- No direct commits to main branch

### Code Quality
- TypeScript strict mode enabled
- ESLint and Prettier configured and enforced
- Pre-commit hooks for linting and formatting
- No console.logs in production code
- Proper error boundaries in React

### Documentation
- Keep this claude.md updated with architectural decisions
- Document all API endpoints
- Component documentation with usage examples
- README with setup and deployment instructions
- Architecture decision records (ADRs) for major decisions

### Performance Budgets
- Initial bundle size: < 200KB (gzipped)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Lighthouse score: > 90 across all metrics

## Tech Stack Decisions

### Frontend
- **Framework**: Next.js 14+ (App Router)
  - Reason: Best-in-class PWA support, excellent performance, great DX
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
  - Reason: Fast development, small bundle, highly customizable
- **State Management**: React Context + Zustand for complex state
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Radix UI or shadcn/ui
  - Reason: Accessible by default, unstyled primitives

### Backend
- **Platform**: Netlify Functions (Serverless)
- **Runtime**: Node.js 20+
- **Database**: Supabase (PostgreSQL)
  - Reason: Built-in auth, real-time subscriptions, great DX
- **Authentication**: Supabase Auth with Magic Links
  - Reason: Passwordless, secure, built-in email handling
- **Email**: Supabase + SendGrid/Resend for transactional emails

### DevOps
- **Hosting**: Netlify
- **CI/CD**: Netlify Build + GitHub Actions
- **Monitoring**: Sentry for error tracking
- **Analytics**: Plausible or Umami (privacy-focused)

### Testing
- **Unit Tests**: Vitest
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright
- **Type Checking**: TypeScript compiler

## Architectural Decisions

### ADR-001: Next.js App Router vs Pages Router
- **Decision**: Use App Router
- **Rationale**: Better performance, native streaming, improved data fetching
- **Consequences**: Learning curve, but better long-term maintainability

### ADR-002: Supabase vs Firebase vs Custom Auth
- **Decision**: Use Supabase
- **Rationale**: PostgreSQL is more powerful, better pricing, open-source, magic link auth built-in
- **Consequences**: Less mature than Firebase, but more flexible

### ADR-003: Monorepo vs Separate Repos
- **Decision**: Monorepo structure with clear separation
- **Rationale**: Easier to maintain consistency, shared types, atomic commits
- **Consequences**: Larger repo, but better for small team

### ADR-004: Progressive Enhancement
- **Decision**: Core functionality works without JavaScript
- **Rationale**: Accessibility, SEO, resilience
- **Consequences**: More work upfront, but better UX

## Smart Progression Algorithm Design

### Core Concepts
1. **Target**: 36,500 total pushups in 365 days
2. **Ideal Daily Goal**: 100 pushups/day
3. **Adaptive**: Adjusts based on user's actual performance
4. **Catch-up Mode**: Recalculates when user misses days
5. **Progressive Overload**: Gradually increases difficulty

### Algorithm Rules
- Track rolling 7-day average to determine user's actual capacity
- If average < 50% of goal, implement tapered progression
- Tapered progression increases by 5-10% week over week
- Always calculate remaining pushups / remaining days for catch-up
- Never suggest more than 200 pushups in a single day (injury prevention)
- Provide weekly milestone goals

## Development Phases

### Phase 1: Foundation (Weeks 1-2)
- Project setup and configuration
- Authentication system
- Database schema and migrations
- Basic PWA shell

### Phase 2: Core Features (Weeks 3-4)
- Daily pushup tracking UI
- Data persistence and sync
- Admin invitation system
- Basic progression calculation

### Phase 3: Smart Features (Weeks 5-6)
- Advanced progression algorithm
- Historical data visualization
- Offline support
- Push notifications

### Phase 4: Polish & Launch (Weeks 7-8)
- Performance optimization
- Comprehensive testing
- User acceptance testing
- Launch preparation

## Success Metrics
- App loads in < 2 seconds on 3G
- 100% uptime during core hours
- Zero data loss events
- Lighthouse score > 90
- User engagement rate > 80% (daily active users)

## Future Enhancements (Post-MVP)
- **AI-Powered Pushup Counter**: Use device camera with pose detection (TensorFlow.js/MediaPipe) to automatically count pushups and provide form feedback
- Social features (leaderboards, challenges)
- Multiple exercise tracking
- Integration with fitness trackers
- Coaching tips and form videos
- Achievement badges and gamification

---

*This document is a living guide. Update it as we learn and evolve.*
