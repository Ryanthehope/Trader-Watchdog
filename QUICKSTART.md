# TradeVerify - Quick Start Guide

## 🚀 Getting Started in 10 Minutes

### Step 1: Open the Project
```bash
cd C:\Users\ryan_\Documents\Websites\tradeverify
code .
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Get Free Database (Choose One)

**Option A: Neon (Recommended)**
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Create new project → Copy connection string
4. Paste into `.env` as `DATABASE_URL`

**Option B: PlanetScale**
1. Go to [planetscale.com](https://planetscale.com)
2. Create database → Get connection string
3. Paste into `.env`

### Step 4: Setup Environment
```bash
# Copy the example
cp .env.example .env

# Generate auth secret
# Use: openssl rand -base64 32
# Or visit: https://generate-secret.vercel.app/32

# Fill in .env with:
# - DATABASE_URL (from Step 3)
# - NEXTAUTH_SECRET (generated above)
# - Leave Stripe/Resend empty for now
```

### Step 5: Create Database Tables
```bash
npm run db:push
```

### Step 6: Run!
```bash
npm run dev
```

Visit: http://localhost:3000

## 🎯 What Works Now

✅ Landing page with features
✅ Responsive design
✅ Database schema ready
✅ Basic UI components

## 📋 Next Steps (In Order)

### 1. Setup Stripe (30 mins)
- Sign up at [stripe.com](https://stripe.com)
- Get API keys → Add to `.env`
- Create product + price
- Test checkout flow

### 2. Setup Email (10 mins)
- Sign up at [resend.com](https://resend.com)
- Get API key → Add to `.env`
- Verify domain (or use onboarding domain)

### 3. Build Authentication (2-3 days)
- Setup NextAuth.js
- Registration page
- Login page
- Protected routes

### 4. Build Dashboard (3-4 days)
- Trader profile
- Insurance upload
- Document management

### 5. Integrate Payments (2 days)
- Checkout flow
- Subscription management
- Customer portal

### 6. Testing (1-2 days)
- End-to-end testing
- Mobile testing
- Payment testing

### 7. Deploy (1 day)
- Push to GitHub
- Connect to Vercel
- Setup domain
- Configure emails

## 💰 Free Tier Limits

- **Neon:** 512 MB storage (plenty for MVP)
- **Vercel:** Unlimited hobby projects
- **Stripe:** Unlimited test transactions
- **Resend:** 3,000 emails/month free

## 🛠️ Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run db:push      # Update database schema
npm run db:studio    # Open Prisma Studio (database GUI)
```

## 📝 File Structure Cheat Sheet

```
/app
  page.tsx              # Landing page ✅
  /dashboard            # TODO: Trader dashboard
  /api
    /webhooks/stripe    # Stripe webhook handler ✅
    /cron/check-expiry  # Insurance expiry checker ✅

/components/ui          # Reusable UI components ✅
/lib                    # Database & API clients ✅
/prisma                 # Database schema ✅
```

## 🐛 Common Issues

**"Module not found"**
→ Run `npm install` again

**"Can't connect to database"**
→ Check `DATABASE_URL` in `.env`

**"Port 3000 in use"**
→ Use `npm run dev -- -p 3001`

**"Prisma error"**
→ Run `npm run db:push` again

## 📞 Client Info

**Name:** Nigel Broderick
**Email:** ngb@thebrodericks.com
**Phone:** 078910 456 43
**Site:** tradeverify.today

## ⏱️ Time Estimates

- Setup & first run: **30 mins**
- Authentication: **2-3 days**
- Dashboard & forms: **3-4 days**
- Payment integration: **2 days**
- Polish & testing: **2-3 days**
- **Total: 2-3 weeks** for working MVP

## 💡 Tips

1. Start simple - get one feature working fully before adding more
2. Test Stripe in test mode (it's free!)
3. Use Prisma Studio to view database: `npm run db:studio`
4. Keep client updated with screenshots
5. Deploy early to Vercel (it's free) so they can see progress

---

**You're all set! Run `npm install` and `npm run dev` to start building! 🎉**
