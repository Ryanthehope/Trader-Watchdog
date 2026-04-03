# Implementation Plan - TradeVerify Insurance Tracking
**Timeline:** 3-4 weeks  
**Budget:** £2,500

---

## 📋 Development Breakdown

### Week 1: Database & Backend Foundation

#### Day 1-2: Database Migration & Schema
- [ ] Set up PostgreSQL database (Neon/Railway)
- [ ] Migrate existing SQLite schema to PostgreSQL
- [ ] Add `InsurancePolicy` model
- [ ] Add `BusinessCategory` model  
- [ ] Add address verification fields to `Member`
- [ ] Run migrations and test

**Files to modify:**
- `server/prisma/schema.prisma`
- Migration scripts

---

#### Day 3-4: Insurance Backend Logic
- [ ] Create insurance CRUD API routes
  - POST `/api/member/insurance` - Add policy
  - PUT `/api/member/insurance/:id` - Update policy
  - GET `/api/member/insurance` - List member's policies
  - DELETE `/api/member/insurance/:id` - Remove policy
- [ ] Create admin insurance routes
  - GET `/api/admin/insurance/expiring` - View upcoming expirations
  - PUT `/api/admin/insurance/:id/verify` - Verify policy document
  - GET `/api/admin/insurance/grace-period` - View policies in grace
- [ ] Business category CRUD routes
  - POST `/api/admin/categories` - Create category
  - GET `/api/categories` - Public list (alphabetical)
  - PUT `/api/admin/categories/:id` - Update
  - DELETE `/api/admin/categories/:id` - Remove

**Files to create:**
- `server/src/routes/insurance.ts`
- `server/src/routes/categories.ts`
- `server/src/lib/insuranceHelper.ts`

---

#### Day 5: Expiry Alert System & Stripe Integration
- [ ] Create cron job for checking expiring policies
- [ ] Implement 90/60/30 day notification logic
- [ ] Grace period calculation and tracking
- [ ] Email template for each alert type
- [ ] Test notification system
- [ ] **Verify Stripe integration** (already in uploaded code)
  - Test subscription creation
  - Verify webhook handling
  - Ensure payment flow works
  - Update product/pricing if needed

**Files to create:**
- `server/src/cron/checkInsuranceExpiry.ts`
- `server/src/lib/emailTemplates/insuranceExpiry.ts`
- `server/src/lib/gracePeriodLogic.ts`

**Files to review/update:**
- `server/src/routes/stripeWebhook.ts` (already exists)
- `server/src/routes/billing.ts` (already exists)

**Cron schedule:** Daily at 9am

---

### Week 2: Member Portal & Payments UI

#### Day 6-7: Insurance Management Interface
- [ ] Insurance dashboard page
  - List all policies
  - Status indicators (valid, expiring soon, expired, grace period)
  - Days until expiry countdown
- [ ] Add insurance policy form
  - Policy type dropdown
  - Policy number, provider
  - Start and expiry dates
  - Document upload (PDF)
- [ ] Edit insurance policy
- [ ] View policy details
- [ ] Upload renewal documents

**Files to create:**
- `src/member/MemberInsurance.tsx`
- `src/member/MemberInsuranceForm.tsx`
- `src/member/MemberPolicyCard.tsx`

---

#### Day 8: Address Verification Upload
- [ ] Address verification page
  - Upload identity document (passport/license)
  - Upload utility bill (with date validation)
  - Status display (pending, verified, rejected)
- [ ] Document preview/download
- [ ] Resubmission if rejected

**Files to create:**
- `src/member/MemberAddressVerification.tsx`
- `src/components/DocumentUpload.tsx`

---

#### Day 9: Member Dashboard Updates & Payment Interface
- [ ] Add insurance status widget
  - Active policies count
  - Expiring soon alerts
  - Grace period warnings
- [ ] Update navigation with insurance link
- [ ] Add alerts for required actions
- [ ] **Verify subscription/billing interface** (already exists)
  - Test Stripe billing portal access
  - Ensure payment method updates work
  - Test invoice viewing
  - Add subscription status to dashboard

**Files to modify:**
- `src/member/MemberOverview.tsx`
- `src/member/MemberLayout.tsx`
- `src/member/MemberBilling.tsx` (already exists - verify/enhance)

---

### Week 3: Admin Panel & Categories

#### Day 10-11: Admin Insurance Management
- [ ] Insurance overview page
  - All members' insurance status
  - Filter by status (valid, expiring, expired, grace)
  - Sort by expiry date
- [ ] Expiring policies dashboard
  - 90 day view
  - 60 day view  
  - 30 day view
  - Grace period view
- [ ] Policy verification interface
  - View uploaded documents
  - Approve/reject policy
  - Add notes
- [ ] Manual notification trigger

**Files to create:**
- `src/staff/StaffInsurance.tsx`
- `src/staff/StaffInsuranceExpiring.tsx`
- `src/staff/StaffPolicyReview.tsx`

---

#### Day 12: Address Verification Admin
- [ ] Address verification queue
- [ ] View identity documents
- [ ] View utility bills
- [ ] Approve/reject with notes
- [ ] Batch operations

**Files to create:**
- `src/staff/StaffAddressVerification.tsx`
- `src/staff/components/DocumentReviewer.tsx`

---

#### Day 13: Business Categories Management & Payment Admin
- [ ] Category CRUD interface
  - Create new categories
  - Edit existing
  - Reorder (alphabetically automatic)
- [ ] Assign members to categories
- [ ] View members by category
- [ ] **Admin payment overview** (verify existing features)
  - View all subscriptions
  - Filter by subscription status
  - Manual refunds (if needed)
  - Payment history
  - Failed payment handling

**Files to create:**
- `src/staff/StaffCategories.tsx`
- `src/components/CategorySelector.tsx`

**Files to review:**
- `src/staff/StaffFinancial.tsx` (already exists - verify/enhance)

---

### Week 4: Public Directory & Search

#### Day 14-15: Enhanced Search
- [ ] Search by name + address
  - Combined input
  - Fuzzy matching on both fields
  - Results showing match confidence
- [ ] Search by name only (dropdown)
  - Autocomplete/typeahead
  - Show all businesses matching name
  - Display address for disambiguation
- [ ] Search results page
  - Business card with key info
  - Insurance status indicator (valid only)
  - Link to full profile

**Files to modify:**
- `src/components/VerifyForm.tsx`
- `src/pages/Home.tsx`

**Files to create:**
- `src/components/SearchDropdown.tsx`
- `src/components/SearchResults.tsx`

---

#### Day 16: Category Directory
- [ ] Public category listing
  - Alphabetical display
  - Business count per category
- [ ] Category page
  - All verified businesses in category
  - Only show businesses with valid insurance
  - Hide expired/grace period businesses
- [ ] Category filtering on search

**Files to create:**
- `src/pages/Categories.tsx`
- `src/pages/CategoryView.tsx`

---

#### Day 17: Public Profile Updates
- [ ] Display business category on profile
- [ ] Show insurance validity (without details)
  - "Insurance Verified ✓"
  - "Last verified: [date]"
- [ ] Hide businesses without valid insurance
- [ ] Grace period handling (hidden from public)

**Files to modify:**
- `src/pages/MemberProfile.tsx`
- `src/components/MemberPreviewCard.tsx`

---

### Week 4: Testing, Deployment & Polish

#### D**Test Stripe payment flow**
  - Application payment (if applicable)
  - Subscription creation
  - Subscription renewal
  - Payment method updates
  - Webhook processing
  - Failed payment handling
  - Cancellation flow
- [ ] ay 18-19: Testing
- [ ] Test insurance CRUD operations
- [ ] Test expiry alert cron job
- [ ] Test grace period logic
- [ ] Test search functionality (both methods)
- [ ] Test address verification workflow
- [ ] Test category management
- [ ] Test admin permissions
- [ ] Test email notifications
- [ ] Mobile responsiveness testing

---

#### D**Configure Stripe for production**
  - Switch to live API keys
  - Set up production webhook endpoint
  - Test live payment flow
  - Configure products/pricing in live mode
  - Set up Stripe billing portal
- [ ] ay 20: Deployment
- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Deploy backend to hosting (Railway/Fly.io)
- [ ] Deploy frontend (build and serve)
- [ ] Set up domain and SSL
- [ ] Configure email service (Resend/SendGrid)
- [ ] Set up cron job scheduler
- [ ] Database backup strategy

---

#### Day 21: Polish & Handover
- [ ] Fix any deployment issues
- [ ] Performance optimization
- [ ] Documentation for Nigel
  - Admin guide
  - Member guide
  - How to add categories
  - How to verify insurance
- [ ] Training session with Nigel
- [ ] Final walkthrough

---

## 🔧 Technical Stack Decisions

### Database: PostgreSQL
**Recommendation:** Neon (serverless PostgreSQL)
- Free tier for development
- Auto-scaling
- Easy backups
- £19/month for production

### Hosting: Railway
**Recommendation:** Railway.app
- Easy Node.js deployment
- Built-in PostgreSQL
- Simple environment variables
- £5-10/month for this size

### Email: Resend
**Recommendation:** Resend.com
- 100 emails/day free
- Great API
- Reliable delivery
- £20/month for production volume

### Cron Jobs: Node-cron + Railway
- Run cron job in main server process
- Railway keeps server running
- Reliable scheduling

### File Storage: Local + Cloudflare R2 (optional)
- Store uploads locally initially
- Can migrate to R2 later if needed
- £0 for first 10GB/month

---

## 📦 Environment Variables Needed

```env
# Database
DATtripe (Payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...  # Subscription price ID

# SABASE_URL=postgresql://...

# Email
RESEND_API_KEY=...
FROM_EMAIL=noreply@tradeverify.today

# Server
JWT_SECRET=...
NODE_ENV=production
PORT=3001

# Cron
CRON_ENABLED=true
CRON_SCHEDULE="0 9 * * *"  # 9am daily

# Grace period
INSURANCE_GRACE_DAYS=10

# URLs
FRONTEND_URL=https://tradeverify.today
API_URL=https://api.tradeverify.today
```

---
Secure Payments (Stripe) 💳
- [ ] Subscription billing for verified businesses
- [ ] Secure checkout process (PCI compliant)
- [ ] Payment method management
- [ ] Automatic renewal handling
- [ ] Failed payment retry logic
- [ ] Stripe billing portal integration
- [ ] Invoice generation and viewing
- [ ] Webhook handling for payment events
- [ ] Subscription status tracking
- [ ] Cancellation and refund handling
- [ ] Admin financial dashboard

### 
## 🎯 Key Features Checklist

### Insurance Tracking ⭐
- [ ] Multiple insurance types supported
- [ ] Expiry date tracking
- [ ] 90/60/30 day email alerts
- [ ] Grace period (7-10 days)
- [ ] Auto-removal after grace period
- [ ] Document upload and storage
- [ ] Admin verification workflow

### Business Categories
- [ ] Create/edit/delete categories
- [ ] Alphabetical display
- [ ] Assign businesses to categories
- [ ] Public category browsing
- [ ] Filter directory by category

### Search Functionality
- [ ] Search by name + address
- [ ] Search by name only (dropdown)
- [ ] Fuzzy matching
- [ ] Results show only verified businesses
- [ ] Hide expired/unverified

### Admin Panel
- [ ] 2 admin users (scalable to more)
- [ ] Insurance verification dashboard
- [ ] Expiring policies view
- [ ] Address verification queue
- [ ] Category management
- [ Stripe Fees** | 1.5% + 20p | Per successful transaction |
| **Domain** | £12/year | Already owned |
| **SSL** | Free | Let's Encrypt |
| **Total Monthly** | ~£50/month + Stripe fees
- [ ] Upload ID (passport/license)
- [ ] Upload utility bill
- [ ] Date validation (within 3 months)
- [ ] Admin review and approve/reject
- [ ] Resubmission flow

---

## 💰 Cost Breakdown

| Item | Cost | Notes |
|------|------|-------|
| **Development** | £2,500 | 21 days of work |
| **Hosting** | £10/month | Railway.app |
| **Database** | £19/month | Neon PostgreSQL |
| **Email** | £20/month | Resend (production volume) |
| **Domain** | £12/year | Already owned |
| **SSL** | Free | Let's Encrypt |
| **Total Monthly** | ~£50/month | Operational costs |

---

## 📧 Update Email to Nigel

**Send after reviewing this plan:**

```
Hi Nigel,

I've put together the detailed implementation plan based on our meeting.

The platform will include everything we discussed:
- Insurance tracking for multiple policy types
- Automated 90/60/30 day expiry alerts
- 10-day grace period management
- Business categories (alphabetically listed)
- Search by name+address AND name dropdown
- Address verification (ID + utility bill)
- Admin panel for 2+ users
- Public directory (verified businesses only)

Timeline: 3-4 weeks
Investment: £2,500 (£1,000 deposit, £1,500 on completion)

I'll be enhancing the existing codebase you have, which means we keep 
all the great work that's already done (member portal, admin panel, 
applications) and add the core insurance tracking features.

Ready to get started whenever you are. Let me know and I'll send 
over the contract.

Ryan
```

---

## 🚀 Ready to Start?

You have:
✅ Clear requirements from Nigel  
✅ Complete analysis of existing code  
✅ 21-day implementation plan  
✅ Technical stack decided  
✅ Fair pricing (£2,500)  

**Next step:** Get Nigel's approval and start building!

Any questions about the implementation plan?
