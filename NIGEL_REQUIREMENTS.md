# TradeVerify - Actual Requirements from Meeting with Nigel
**Date:** April 3, 2026

---

## 🎯 Business Model

**Core Purpose:** Help homeowners verify that traders have valid insurance before hiring them.

**How It Works:**
1. Traders and businesses apply to be verified
2. Insurance documents are validated by admin
3. Verified businesses appear in public directory
4. Homeowners can search and check businesses before hiring

---

## ✅ Required Features

### 1. Insurance Verification & Tracking ⭐ CORE FEATURE

**Requirements:**
- Track insurance policies for each business
- Monitor expiry dates
- Support different insurance types:
  - Public Liability Insurance
  - Waste Disposal License
  - Other insurance types as needed
- **Grace Period:** 7-10 days after expiry before removal from directory
- **Automated Alerts:** Send warnings at 90, 60, and 30 days before expiry

**Critical:** This is the ENTIRE business model. Without this, the platform has no value.

---

### 2. Business Categories & Directory

**Requirements:**
- Define business categories/trades:
  - Plumber
  - Electrician
  - Builder
  - Waste Disposal
  - Landscaper
  - etc.
- **Alphabetical listing** of categories
- Each business assigned to one or more categories
- Public directory browsable by category

---

### 3. Search Functionality

**Two Search Methods:**

**A) Search by Name + Address**
- User enters business name AND address
- Returns specific match
- Confirms business location

**B) Search by Name Only (Dropdown)**
- Dropdown/autocomplete of business names
- User selects from list
- Shows all matches if multiple businesses have same name

---

### 4. Admin Access & Permissions

**Requirements:**
- **2 admin users initially** (can add more later)
- Secure login (2FA recommended)
- Admin capabilities:
  - Review and approve applications
  - Verify insurance documents
  - Add/edit/remove businesses
  - Manage expiry dates
  - Send manual notifications
  - View all upcoming expirations
  - Access verification documents

**Scalability:** Must support adding more admins in future

---

### 5. Address Verification Workflow

**Purpose:** Confirm business operates from stated address

**Required Documents (one from each category):**

**Identity Verification:**
- Driver's License, OR
- Passport

**Address Proof:**
- Utility bill dated within last 3 months
- Must match business address

**Workflow:**
1. Applicant uploads documents
2. Admin reviews documents
3. Admin confirms address matches or rejects
4. Approved businesses added to directory

---

### 6. Insurance Expiry Alert System

**Automated Email Notifications:**

**90 Days Before Expiry:**
- "Your insurance expires in 3 months"
- Request renewal documentation
- First warning

**60 Days Before Expiry:**
- "Your insurance expires in 2 months"
- Urgent renewal reminder
- Second warning

**30 Days Before Expiry:**
- "Your insurance expires in 1 month"
- Final warning before removal
- Action required immediately

**On Expiry:**
- **Grace Period:** 7-10 days to provide renewed insurance
- Daily reminders during grace period
- After grace period: Remove from directory or mark as "unverified"

**Post Grace Period:**
- Email: "You have been removed from the directory"
- Explain how to reinstate (upload new insurance)

---

## 📊 What We Have vs What We Need

### Uploaded Code (Vite+Express) Status:

| Feature | Status | Notes |
|---------|--------|-------|
| Member Portal | ✅ Built | Traders can login and manage profile |
| Admin Panel | ✅ Built | 2FA enabled, multi-user support |
| Application Workflow | ✅ Built | Apply → Review → Approve |
| Document Uploads | ✅ Built | Can upload files |
| Public Directory | ✅ Built | Member profiles viewable |
| Search | ⚠️ Partial | Has lookup, needs name+address AND dropdown |
| Categories | ❌ Missing | No business category structure |
| **Insurance Tracking** | ❌ **MISSING** | **CORE FEATURE NOT BUILT** |
| **Expiry Alerts** | ❌ **MISSING** | **NO AUTOMATED NOTIFICATIONS** |
| **Grace Period Logic** | ❌ **MISSING** | **NO GRACE PERIOD TRACKING** |
| Address Verification | ⚠️ Partial | Has document upload, no verification workflow |

### Your Next.js Project Status:

| Feature | Status | Notes |
|---------|--------|-------|
| **Insurance Tracking** | ✅ **Built** | **Full model with expiry dates** |
| **Expiry Alerts** | ✅ **Built** | **90/60/30 day notifications** |
| **Grace Period Logic** | ⚠️ **Can Add** | **Easy to implement** |
| Categories | ❌ Missing | Need to build |
| Directory | ❌ Missing | Need to build |
| Search | ❌ Missing | Need to build |
| Admin Panel | ⚠️ Partial | Structure exists, UI needed |
| Member Portal | ⚠️ Partial | Structure exists, UI needed |

---

## 🔧 Technical Requirements

### Database Schema Additions Needed:

**For Uploaded Code (if using that):**
```prisma
model InsurancePolicy {
  id              String   @id @default(cuid())
  memberId        String
  policyType      String   // "Public Liability", "Waste Disposal", etc.
  policyNumber    String
  provider        String
  coverageAmount  Int
  startDate       DateTime
  expiryDate      DateTime
  renewalGraceDays Int     @default(10)
  documentUrl     String?
  
  // Notification tracking
  notified90Days  Boolean  @default(false)
  notified60Days  Boolean  @default(false)
  notified30Days  Boolean  @default(false)
  notifiedExpiry  Boolean  @default(false)
  
  // Grace period tracking
  inGracePeriod   Boolean  @default(false)
  gracePeriodEndsAt DateTime?
  
  member          Member   @relation(fields: [memberId], references: [id])
  
  @@index([expiryDate])
}

model BusinessCategory {
  id          String   @id @default(cuid())
  name        String   @unique  // "Plumber", "Electrician", etc.
  slug        String   @unique  // "plumber", "electrician"
  sortOrder   Int      @default(0)
  members     Member[]
}

// Add to Member model:
model Member {
  // ... existing fields
  categoryId  String?
  category    BusinessCategory? @relation(fields: [categoryId], references: [id])
  
  // Address verification
  addressVerified Boolean @default(false)
  addressVerifiedAt DateTime?
  addressVerifiedBy String?  // Staff member who verified
  
  // Documents for address verification
  identityDocumentUrl String?  // Passport or Driver's License
  addressProofUrl     String?  // Utility bill
  addressProofDate    DateTime? // Date on utility bill
}
```

**For Next.js Project (if using that):**
- Already has `InsurancePolicy` model ✅
- Need to add `BusinessCategory` model
- Need to add `gracePeriod` logic to existing model
- Need to enhance `Trader` model with address verification fields

---

## 🎯 Recommended Approach

### Option A: Enhance Uploaded Code (FASTEST) ⭐ RECOMMENDED

**What to do:**
1. Migrate SQLite → PostgreSQL
2. Add insurance tracking models to database
3. Build insurance management UI in member portal
4. Add insurance display in admin panel
5. Create cron job for expiry alerts
6. Add business categories
7. Enhance search (name+address, dropdown)
8. Add address verification workflow
9. Deploy to production

**Pros:**
- ✅ 90% of UI already built
- ✅ Member portal functional
- ✅ Admin panel functional
- ✅ Application workflow exists
- ✅ Can launch in 3-4 weeks

**Cons:**
- ❌ Different architecture than your Next.js work
- ❌ Your Next.js code becomes reference only

**Price:** £2,200-2,800  
**Timeline:** 3-4 weeks

---

### Option B: Complete Your Next.js Project (CLEANER LONG-TERM)

**What to do:**
1. Build member portal UI
2. Build admin panel UI
3. Add business categories
4. Build public directory
5. Build search functionality
6. Add application workflow
7. Insurance tracking already done ✅
8. Deploy to production

**Pros:**
- ✅ Your preferred architecture
- ✅ Insurance tracking already built
- ✅ Vercel deployment (simpler)
- ✅ Modern Next.js 14

**Cons:**
- ❌ Must build all UI from scratch
- ❌ Longer timeline
- ❌ Higher cost

**Price:** £3,500-4,500  
**Timeline:** 5-6 weeks

---

## 💰 Recommended Pricing

### Phase 1: Core Platform (Option A - Enhance Uploaded Code)

**Deliverables:**
- PostgreSQL database migration
- Insurance policy tracking system
- Insurance management interface (member portal)
- Insurance verification (admin panel)
- Automated expiry alerts (90/60/30 days)
- Grace period logic (7-10 days)
- Business categories with alphabetical listing
- Enhanced search (name+address AND dropdown)
- Address verification workflow
- Production deployment
- Testing and bug fixes

**Price: £2,500**

**Timeline: 3-4 weeks**

**Payment Terms:**
- 40% deposit (£1,000) to start
- 60% (£1,500) on completion

---

### Phase 2: Enhancements (Optional - After Launch)

**Potential features:**
- Enhanced reporting and analytics
- Bulk operations for admin
- Email template customization
- SMS alerts (in addition to email)
- Mobile app for traders
- API for third-party integrations

**Price: £500-1,000 per feature or £600-800/month retainer**

---

## 🔥 Critical Next Steps

### Immediate Actions:

1. **Confirm with Nigel:**
   - ✅ Insurance types to track (Public Liability, Waste, etc.)
   - ✅ Grace period: 7 or 10 days?
   - ✅ Business categories list (which trades?)
   - ✅ Email notification content/design preferences
   - ✅ Timeline urgency (can wait 3-4 weeks?)

2. **Technical Setup:**
   - Set up PostgreSQL database (Neon/PlanetScale)
   - Set up email service (Resend/SendGrid)
   - Set up hosting (Railway/Fly.io/DigitalOcean)
   - Get domain access
   - Get Stripe account access

3. **Start Development:**
   - Database schema migration
   - Insurance model implementation
   - Cron job setup
   - UI development

---

## 📧 Follow-Up Email to Nigel

**Send this:**

```
Hi Nigel,

Great meeting you today. Thanks for clarifying the requirements - it's 
much clearer now what the platform needs to do.

Based on our discussion, the existing source code covers about 70% of 
what you need (member portal, admin panel, directory, applications). 

The key missing piece is the insurance tracking and expiry alert system, 
which is actually the core of your business model. The good news is I've 
already built exactly this for my Next.js version, so I know exactly how 
to implement it.

Here's what I'll deliver:

**Core Features:**
✅ Insurance policy tracking (multiple policy types)
✅ Automated expiry alerts (90, 60, 30 days)
✅ Grace period management (7-10 days)
✅ Business categories (alphabetically listed)
✅ Search by name+address AND name dropdown
✅ Address verification workflow (ID + utility bill)
✅ Admin panel for 2+ users
✅ Member portal for businesses

**Timeline:** 3-4 weeks from project start  
**Investment:** £2,500

I'll need 40% (£1,000) to begin, with the remainder on completion.

I can start immediately. Let me know if you'd like to proceed and I'll 
send over the contract and invoice.

Looking forward to building this with you.

Ryan
Head-Start Web Development
```

---

## ✅ Success Criteria

Platform is successful when:

1. ✅ Businesses can apply and be verified
2. ✅ Insurance documents are uploaded and tracked
3. ✅ Public directory shows only businesses with valid insurance
4. ✅ Automated emails sent at 90/60/30 days before expiry
5. ✅ Grace period properly tracked and enforced
6. ✅ Businesses can be searched by name+address
7. ✅ Admin can manage all verifications
8. ✅ Homeowners trust the verification system

---

## 🎯 Bottom Line

**You should use the uploaded code as the foundation** and add the insurance tracking features from your Next.js project. This gets Nigel launched fastest with the complete feature set he needs.

The uploaded code gives you 70% of the work done. You just need to add the 30% that actually makes the business model work (insurance tracking).

**This is very doable in 3-4 weeks for £2,500.**

Ready to send the follow-up and start building? 🚀
