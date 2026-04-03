# TradeVerify - MVP Project

A trader verification platform with subscription management and insurance expiry tracking.

## Tech Stack

- **Frontend/Backend:** Next.js 14 with App Router (TypeScript)
- **Database:** PostgreSQL (via Neon/PlanetScale)
- **ORM:** Prisma
- **Authentication:** NextAuth.js v5
- **Payments:** Stripe
- **Email:** Resend
- **Styling:** Tailwind CSS
- **Hosting:** Vercel

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Required:**
- `DATABASE_URL` - Get from [Neon](https://neon.tech) or [PlanetScale](https://planetscale.com)
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `STRIPE_SECRET_KEY` - From [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
- `RESEND_API_KEY` - From [Resend](https://resend.com)

### 3. Setup Database

```bash
npm run db:push
```

This creates all tables in your database.

### 4. Setup Stripe

1. Create a product in Stripe Dashboard (e.g., "Annual Trader Verification")
2. Create a recurring price (12 months, £XX)
3. Copy the Price ID to `.env` as `STRIPE_PRICE_ID`
4. Setup webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
5. Copy webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

See [STRUCTURE.md](./STRUCTURE.md) for detailed folder structure and architecture.

**Quick Overview:**
```
/app
  /(public)        # Public pages - landing, verify, etc.
  /(auth)          # Login, register, password reset
  /(dashboard)     # Protected trader portal
  /(admin)         # Admin-only area
  /api             # API routes & webhooks

/components
  /ui              # Base UI components (Button, Card, etc.)
  /auth            # Authentication components
  /dashboard       # Dashboard-specific components
  /admin           # Admin components
  /forms           # Form components

/lib
  /actions         # Server Actions for data mutations
  /hooks           # Custom React hooks
  /validations     # Zod validation schemas
  prisma.ts        # Database client
  stripe.ts        # Stripe client

/types             # TypeScript type definitions
/prisma            # Database schema
```

## Database Schema

**Key Models:**
- `User` - Authentication & base user data
- `Trader` - Business details & verification status
- `Subscription` - Stripe subscription tracking
- `InsurancePolicy` - Insurance documents with expiry tracking
- `Certification` - Professional certifications

## Features Implemented

✅ Landing page with features
✅ Database schema
✅ Stripe webhook handling
✅ Insurance expiry cron job
✅ Email notification system

## Development Status

### ✅ Phase 0 - Foundation (COMPLETE)
- Database schema with all core models
- Stripe integration & webhook handling
- Insurance expiry cron job
- Email notification system (Resend)
- Basic Next.js 14 setup
- Folder structure organized

### 🔨 Phase 1 - Authentication & Onboarding (IN PROGRESS)
- [ ] NextAuth configuration
- [ ] Login/Register pages
- [ ] Trader onboarding flow
- [ ] Email verification
- [ ] Base UI component library

### 📋 Phase 2 - Trader Portal (PENDING)
- [ ] Dashboard overview with stats
- [ ] Profile management
- [ ] Insurance policy CRUD
- [ ] Certification CRUD
- [ ] Subscription management interface
- [ ] Document upload (Vercel Blob)

### 📋 Phase 3 - Admin Area (PENDING)
- [ ] Admin dashboard
- [ ] User & trader management
- [ ] Verification workflow
- [ ] Expiring insurance monitor UI
- [ ] Platform settings

### 📋 Phase 4 - Polish & Deploy (PENDING)
- [ ] Enhanced public site design
- [ ] Mobile optimization
- [ ] Performance optimization
- [ ] Production deployment
- [ ] Domain & email setup

## TODO - MVP Features (Legacy Note)

### Authentication
- [ ] Setup NextAuth.js with email/password
- [ ] Registration flow for traders
- [ ] Login/logout functionality

### Dashboard
- [ ] Trader dashboard layout
- [ ] Profile management
- [ ] Insurance upload interface
- [ ] Certification management

### Subscription
- [ ] Stripe Checkout integration
- [ ] Subscription status display
- [ ] Customer portal link

### File Upload
- [ ] Vercel Blob integration for PDFs
- [ ] Insurance document upload
- [ ] Document preview

### Admin
- [ ] Admin panel for verification
- [ ] Trader approval workflow

## Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Setup Cron Job

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/check-expiry",
    "schedule": "0 9 * * *"
  }]
}
```

This runs daily at 9 AM to check insurance expiries.

### Environment Variables on Vercel

Add all `.env` variables to Vercel dashboard under Settings → Environment Variables.

## Email Templates

Insurance expiry emails are sent at:
- 90 days before expiry
- 60 days before expiry
- 30 days before expiry

Customize templates in `/app/api/cron/check-expiry/route.ts`

## Stripe Testing

Use test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

## Cost Estimates

### Development Costs
- **Initial Build:** £4,000 - £6,000
- **4-8 weeks** of development

### Monthly Running Costs (Initial)
- Hosting (Vercel): £0 (Hobby) → £20 (Pro when needed)
- Database (Neon): £0 → £10/month
- Email (Resend): £0 (3,000 emails/month)
- Stripe: 1.5% + 20p per transaction
- **Total: £0-50/month**

### Scaling (500+ subscribers)
- Vercel Pro: £20/month
- Database: £25/month
- Email: £20/month
- **Total: £65/month + transaction fees**

## Support

For questions, contact: ryan@yoursite.com

## Client Details

**Client:** Nigel Broderick
**Email:** ngb@thebrodericks.com
**Phone:** 078910 456 43
**Domain:** tradeverify.today

## Next Steps

1. ✅ **Project Setup** - Done!
2. **Get Credentials** - Neon DB, Stripe, Resend
3. **Build Auth** - Registration & login
4. **Build Dashboard** - Trader profile management
5. **Integrate Stripe** - Subscription checkout
6. **Add File Upload** - Insurance documents
7. **Test End-to-End**
8. **Deploy to Vercel**
9. **Connect Domain**
10. **Client Review**

---

Built with ❤️ for TradeVerify MVP
