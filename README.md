# TradeVerify

A trader verification platform with a public directory, staff portal, trader portal, subscription billing, and insurance expiry tracking.

## Actual Stack

- **Frontend:** React 18 + Vite + React Router + TypeScript
- **Backend:** Express + TypeScript
- **Database:** PostgreSQL via Prisma
- **Authentication:** Custom JWT auth for staff and member portals
- **Payments:** Stripe
- **Styling:** Tailwind CSS
- **Hosting:** Vercel (frontend) + Railway (backend/database)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Important variables used by the current app:

- Frontend: `VITE_API_URL`
- Backend: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Staff bootstrap: `STAFF_SEED_EMAIL`, `STAFF_SEED_PASSWORD`, `STAFF_SEED_NAME`
- Scheduled tasks: `CRON_SECRET`

### 3. Setup Database

```bash
cd server
npx prisma migrate deploy
```

### 4. Run The App

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd server
npm install
npm run dev
```

The frontend expects the API at `VITE_API_URL` in production. In local development, Vite proxies `/api` to `http://localhost:3001`.

### 5. Staff Login Bootstrap

If `STAFF_SEED_EMAIL`, `STAFF_SEED_PASSWORD`, and `STAFF_SEED_NAME` are set on the backend, startup will create or update the staff account automatically.

This was added so the live admin portal can recover from an empty `staff` table without running a manual seed script.

### 6. Stripe And Billing

1. Create a product in Stripe Dashboard (e.g., "Annual Trader Verification")
2. Create a recurring price (12 months, £XX)
3. Copy the Price ID to `.env` as `STRIPE_PRICE_ID`
4. Setup webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
5. Copy webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`

## Project Structure

See [STRUCTURE.md](./STRUCTURE.md) for detailed folder structure and architecture.

**Quick Overview:**
```
/src
  /pages           # Public pages
  /member          # Trader portal screens and auth
  /staff           # Staff portal screens and auth
  /components      # Shared UI and forms
  /lib             # Frontend API helpers and utilities

/server/src
  /routes          # Express route handlers
  /lib             # Server-side helpers
  /middleware      # Auth and request middleware

/server/prisma     # Backend Prisma schema and migrations
/public            # Static public assets
```

## Current Status

### Working now
- Public marketing site and member profile pages
- Separate staff and trader login routes
- Staff portal authentication against live Railway database
- Member portal authentication and billing screens
- Insurance CRUD and expiry tracking flows
- Categories CRUD endpoints plus staff-side category assignment for members
- Guides content management and public guide pages
- Stripe billing and invoice-related flows already present in the codebase

### Fixed in recent sessions
- Repaired a broken backend route in `server/src/routes/apiPublic.ts`
- Restored membership visibility helper logic used by the member and public APIs
- Unblocked server builds where legacy admin routes referenced removed Prisma models
- Added automatic staff seeding on server startup from environment variables
- Restored `/staff/login` and separated staff vs trader login UX
- Fixed copied login credentials failing because of trailing whitespace or newline characters

### Still to do
- Expose categories properly in the public directory, public profiles, and search
- Build the full address verification workflow and staff review tools
- Improve public search beyond the current simpler lookup flow
- Replace or remove legacy `adminOps` surfaces that still do not match the current schema cleanly
- Add broader regression testing for auth, billing, cron jobs, and member/staff flows

## Current Priorities

1. Finish public category browsing and make categories drive the public directory and search.
2. Build address verification for members and staff.
3. Tighten admin technical debt, especially legacy routes not represented in the Prisma schema.
4. Expand test coverage around production-critical flows.

## Deployment

### Frontend Deployment

```bash
npm install -g vercel
vercel
```

### Backend Deployment

Deploy the server to Railway and ensure the frontend `VITE_API_URL` points at the Railway base URL.

### Setup Cron Job

Protect cron endpoints with `CRON_SECRET` and trigger the server cron route rather than relying on an old App Router path.

```json
{
  "crons": [{
    "path": "/api/cron/check-expiry",
    "schedule": "0 9 * * *"
  }]
}
```

The insurance check route currently lives on the backend API.

### Environment Variables

Set frontend variables in Vercel and backend variables in Railway. `NEXTAUTH_*` variables are not part of the active login flow.

## Insurance Alerts

Insurance visibility includes a 14-day grace period after expiry before a member is removed from the public directory.

See the repo memory note at `/memories/repo/insurance-grace-period.md` for the current rule.

## Stripe Testing

Use test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

## Next Steps

1. Finish category assignment in the schema, APIs, and staff UI.
2. Build the address verification member flow and staff review flow.
3. Replace or retire legacy admin routes that do not match the current Prisma models.
4. Run full regression checks across login, billing, insurance alerts, and public visibility rules.

---
