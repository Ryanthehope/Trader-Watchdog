# TradeVerify

A trader verification platform with a public directory, staff portal, trader portal, subscription billing, and insurance expiry tracking.

## Actual Stack

- **Frontend:** React 18 + Vite + React Router + TypeScript
- **Backend:** Express + TypeScript
- **Database:** PostgreSQL via Prisma
- **Authentication:** Custom JWT auth for staff and member portals
- **Payments:** GoCarless for one-off joining and annual renewal payments
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
- Backend: `DATABASE_URL`, `JWT_SECRET`, `GoCardless_SECRET_KEY`, `GoCardless_WEBHOOK_SECRET`
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

### 6. GoCardless And Billing

1. Set `GoCardless_SECRET_KEY` and `GoCardless_WEBHOOK_SECRET` on the backend
2. Enable billing in staff settings and confirm the checkout amounts/names there
3. Setup webhook endpoint: `https://your-backend-domain/api/goCardless/webhook`
4. The checkout order is approval -> registration fee -> annual membership -> member provisioning
5. Use one-off checkout for the initial joining fee and annual member renewals

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

### Completion estimate excluding Sumsub

- Estimated completion without Sumsub: `90%`
- Remaining work is mostly member-portal/backend cleanup, legacy-route removal, and production validation rather than major new feature builds

### Working now
- Public marketing site and member profile pages
- Separate staff and trader login routes
- Staff portal authentication against live Railway database
- Member portal authentication and billing screens
- Insurance CRUD and expiry tracking flows
- Guides content management and public guide pages
- GoCardless billing, invoice, and annual renewal flows already present in the codebase
- Monthly GoCardless subscription creation is no longer part of the active billing flow
- The first unused legacy finance endpoint has been removed from `adminOps.ts`
- A dormant legacy `system-info` and `staff-accounts` slice has been removed from `adminOps.ts`
- A redundant manual `organization-branding/sync-GoCardless` endpoint has been removed from `adminOps.ts`
- An unused `ai-prompts` CRUD slice has been removed from `adminOps.ts`
- An unused `members-options` endpoint has been removed from `adminOps.ts`
- An unused `planner-events` CRUD slice has been removed from `adminOps.ts`
- An unused `dispatch-tasks` CRUD slice has been removed from `adminOps.ts`
- An unused `reviews` moderation slice has been removed from `adminOps.ts`
- An unused `inbox` CRUD slice has been removed from `adminOps.ts`
- Member portal business-details, documents, insurance, password, and billing screens are live
- Trader application -> approval -> payment -> member provisioning flow is implemented
- 30-day / 14-day insurance reminders and 14-day grace-period visibility rules are implemented
- Member portal stray analytics/settings routes now redirect back to real member pages
- Staff applications can now create or reuse Sumsub sandbox applicants, open a launch link, and manually sync review status back into the application
- Sumsub webhooks can now update application and linked member verification state automatically through `/api/sumsub/webhook`
- Verification state now survives the application -> member provisioning handoff, so the member portal reflects synced verification outcomes
- Verification page is now a status/info page backed by member verification data rather than a dead placeholder

### Fixed in recent sessions
- Repaired a broken backend route in `server/src/routes/apiPublic.ts`
- Restored membership visibility helper logic used by the member and public APIs
- Unblocked server builds where legacy admin routes referenced removed Prisma models
- Added automatic staff seeding on server startup from environment variables
- Restored `/staff/login` and separated staff vs trader login UX
- Fixed copied login credentials failing because of trailing whitespace or newline characters

### Still to do
- Continue removing legacy `adminOps` surfaces that still do not match the current schema cleanly
- Add broader regression testing for auth, billing, cron jobs, and member/staff flows
- Improve public search/category exposure further if that remains part of current launch scope
- Finish the final applicant-facing verification entry flow and validate webhook delivery end to end in sandbox/live

Sumsub is now partially integrated in sandbox. The remaining gap is production readiness, not first-time backend wiring.

## Current Priorities

1. Tighten admin technical debt, especially legacy routes not represented in the Prisma schema.
2. Expand validation around production-critical flows: application approval, annual billing/renewal, webhook, cron, and member visibility.
3. Improve public category/search exposure only if it remains part of immediate launch scope.
4. Finish Sumsub production-readiness work: applicant entry UX, webhook delivery validation, and live-environment validation.

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

## GoCardless Testing

Use test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

## Next Steps

1. Fix `member/analytics` and `member/settings` so the member portal only exposes real member screens.
2. Decide whether the member verification page should stay as a status page or become the applicant-facing launch entry for future Sumsub self-serve flow.
3. Replace or retire legacy admin routes that do not match the current Prisma models.
4. Run full regression checks across application approval, billing, insurance alerts, cron, public visibility rules, and Sumsub webhook-driven review-state updates.

---
