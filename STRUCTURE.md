# Project Structure - TradeVerify

## Overview
Restructured Next.js 14 App Router project with clear separation of concerns.

## Folder Structure

```
tradeverify/
├── app/                          # Next.js 14 App Router
│   ├── (public)/                 # Public pages (no auth required)
│   │   ├── page.tsx             # Homepage / Landing
│   │   ├── about/
│   │   ├── pricing/
│   │   ├── contact/
│   │   └── verify/              # Public trader lookup
│   │
│   ├── (auth)/                   # Authentication pages
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   │
│   ├── (dashboard)/              # Protected trader dashboard
│   │   ├── layout.tsx           # Dashboard layout with sidebar
│   │   ├── dashboard/
│   │   │   └── page.tsx         # Main dashboard
│   │   ├── profile/
│   │   │   └── page.tsx         # Business profile management
│   │   ├── insurance/
│   │   │   ├── page.tsx         # View all policies
│   │   │   └── [id]/            # Edit specific policy
│   │   ├── certifications/
│   │   │   └── page.tsx         # Certifications management
│   │   ├── subscription/
│   │   │   └── page.tsx         # Billing & subscription
│   │   └── settings/
│   │       └── page.tsx         # Account settings
│   │
│   ├── (admin)/                  # Admin-only area
│   │   ├── layout.tsx           # Admin layout
│   │   ├── admin/
│   │   │   └── page.tsx         # Admin dashboard
│   │   ├── users/
│   │   │   ├── page.tsx         # User management
│   │   │   └── [id]/            # Edit user
│   │   ├── traders/
│   │   │   ├── page.tsx         # All traders
│   │   │   └── [id]/            # Trader details
│   │   ├── expiring/
│   │   │   └── page.tsx         # Expiring insurance monitor
│   │   └── settings/
│   │       └── page.tsx         # Platform settings
│   │
│   ├── api/                      # API routes
│   │   ├── auth/                # NextAuth endpoints
│   │   ├── traders/             # Trader CRUD operations
│   │   ├── insurance/           # Insurance CRUD
│   │   ├── subscriptions/       # Subscription management
│   │   ├── webhooks/
│   │   │   └── stripe/          # Stripe webhooks (EXISTING)
│   │   └── cron/
│   │       └── check-expiry/    # Expiry cron (EXISTING)
│   │
│   ├── globals.css              # Global styles
│   └── layout.tsx               # Root layout
│
├── components/                   # React components
│   ├── ui/                      # Base UI components
│   │   ├── Button.tsx          # (EXISTING)
│   │   ├── Card.tsx            # (EXISTING)
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Table.tsx
│   │   ├── Modal.tsx
│   │   ├── Alert.tsx
│   │   └── Badge.tsx
│   │
│   ├── auth/                    # Authentication components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── AuthProvider.tsx
│   │
│   ├── dashboard/               # Dashboard-specific components
│   │   ├── Sidebar.tsx
│   │   ├── DashboardStats.tsx
│   │   ├── ExpiryAlerts.tsx
│   │   └── QuickActions.tsx
│   │
│   ├── admin/                   # Admin components
│   │   ├── UserTable.tsx
│   │   ├── TraderTable.tsx
│   │   └── ExpiryMonitor.tsx
│   │
│   └── forms/                   # Form components
│       ├── InsuranceForm.tsx
│       ├── CertificationForm.tsx
│       ├── ProfileForm.tsx
│       └── SubscriptionForm.tsx
│
├── lib/                         # Utility functions & configs
│   ├── prisma.ts               # Database client (EXISTING)
│   ├── stripe.ts               # Stripe client (EXISTING)
│   ├── utils.ts                # Utility functions (EXISTING)
│   ├── auth.ts                 # NextAuth config
│   ├── email.ts                # Email helpers (Resend)
│   │
│   ├── actions/                # Server Actions
│   │   ├── trader.ts           # Trader CRUD actions
│   │   ├── insurance.ts        # Insurance actions
│   │   ├── certification.ts    # Certification actions
│   │   └── subscription.ts     # Subscription actions
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-trader.ts
│   │   ├── use-subscription.ts
│   │   └── use-toast.ts
│   │
│   └── validations/            # Zod schemas
│       ├── trader.ts
│       ├── insurance.ts
│       └── auth.ts
│
├── types/                       # TypeScript types
│   ├── index.ts                # Shared types
│   ├── api.ts                  # API response types
│   └── database.ts             # Extended Prisma types
│
├── prisma/
│   └── schema.prisma           # Database schema (EXISTING)
│
├── public/                      # Static assets
│   ├── images/
│   ├── icons/
│   └── documents/
│
└── config files                 # Next, TS, Tailwind configs

```

## Route Groups Explained

### `(public)` - No Authentication Required
- Landing pages, marketing content
- Public trader lookup/verification
- Accessible to anyone

### `(auth)` - Authentication Pages
- Login, registration, password reset
- Separate layout without main navigation
- Redirects authenticated users to dashboard

### `(dashboard)` - Trader Portal
- Protected routes (requires authentication)
- Shared dashboard layout with sidebar
- Trader-specific functionality

### `(admin)` - Admin Area
- Protected routes (requires admin role)
- Separate admin layout
- User/trader management, monitoring

## Key Patterns

### Server Actions Pattern
```typescript
// lib/actions/trader.ts
'use server'

export async function updateTraderProfile(traderId: string, data: TraderData) {
  // Server-side logic
}
```

### Component Organization
- **Base UI**: Reusable, generic components
- **Feature Components**: Specific to dashboard/admin/auth
- **Forms**: Complex form components with validation

### Data Fetching
- Server Components for initial data
- Server Actions for mutations
- Client Components only when interactivity needed

## Next Steps for Development

### Phase 1 - Core Infrastructure
1. ✅ Database schema (DONE)
2. ✅ Stripe integration (DONE)
3. ✅ Expiry monitoring (DONE)
4. 🔨 NextAuth configuration
5. 🔨 Base UI component library

### Phase 2 - Authentication & Registration
1. Login/Register pages
2. Onboarding flow for traders
3. Email verification

### Phase 3 - Trader Portal
1. Dashboard overview
2. Profile management
3. Insurance policy CRUD
4. Certification CRUD
5. Subscription management

### Phase 4 - Admin Area
1. Admin dashboard
2. User management
3. Trader verification workflow
4. Expiry monitoring UI
5. Platform settings

## Development Guidelines

- **TypeScript strict mode** - All files must be typed
- **Server Components by default** - Use 'use client' only when necessary
- **Zod for validation** - All forms and API inputs
- **Prisma for data access** - No raw SQL
- **Tailwind for styling** - Component-first approach
- **Mobile-first design** - Responsive by default

## Environment Variables Required

See `.env.example` for full list:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `CRON_SECRET`
