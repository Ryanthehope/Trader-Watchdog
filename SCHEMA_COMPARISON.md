# Database Schema Comparison

## 🔍 Critical Finding: Two Different Business Models

The uploaded code and your Next.js project have **fundamentally different data structures** because they solve different problems.

---

## Uploaded Code Schema (SQLite - /server/prisma/schema.prisma)

### Core Models:

**Staff** (Admin users)
- Email, password, 2FA (TOTP)
- For platform administrators

**Member** (Verified traders)
- Profile data: name, trade, location, slug, tvId
- Business details: invoice address, bank details, VAT
- Portal access: loginEmail, passwordHash
- Membership: expiresAt, billingType, Stripe IDs
- Branding: profileLogo, documentAccentHex
- **No insurance tracking**
- **No certification expiry tracking**

**Application** (Trader applications)
- Pending applications from Join form
- Approval workflow
- Provisioning to Member after payment

**Lead** (Customer inquiries)
- Job postings from public
- Assigned to members
- CRM workflow

**MemberQuote** (Quotes to customers)
- Quote creation by members
- Line items, totals, VAT
- Sent to customers

**MemberTradeInvoice** (Invoices from members)
- Invoice generation
- Payment tracking
- Customer billing

**MemberReview** (Customer reviews)
- Public reviews of members
- Approval workflow
- Reply system

**MemberJob** (Jobs/projects)
- Track active work
- Completion status

**DispatchTask** (Lead assignment)
- Assign leads to members
- Tracking system

**MemberDocument** (Verification docs)
- Document uploads
- File storage

**MemberAvailabilityDay** (Calendar)
- Public availability display
- Booking prevention

### Focus: **General verification + CRM + lead generation**

---

## Your Next.js Schema (PostgreSQL - /prisma/schema.prisma)

### Core Models:

**User** (NextAuth base)
- Email, name, password
- Role: TRADER or ADMIN
- NextAuth integration

**Account + Session** (NextAuth)
- OAuth providers
- Session management

**Trader** (Business details)
- Business info: name, address, phone, postcode
- Registration number
- Verification status
- **Links to: Subscription, InsurancePolicy, Certification**

**Subscription** (Stripe billing)
- Stripe customer/subscription IDs
- Status tracking
- Period tracking
- Cancellation handling

**InsurancePolicy** ⭐ (Key feature)
- Policy type, number, provider
- Coverage amount
- **Start and expiry dates**
- Document storage (Vercel Blob)
- **Notification flags (30/60/90 days)**
- **Indexed by expiry date** for automated monitoring

**Certification** ⭐ (Key feature)  
- Certification name (Gas Safe, NICEIC, etc.)
- Certificate number, issuer
- Issue and expiry dates
- Document storage

### Focus: **Insurance compliance monitoring + certification tracking**

---

## Side-by-Side Comparison

| Feature | Uploaded Code | Your Next.js Project |
|---------|---------------|----------------------|
| **User Management** | Staff (admin) + Member | User (with roles) |
| **Trader Details** | Member (business info) | Trader (business info) |
| **Insurance Tracking** | ❌ None | ✅ Full model with expiry alerts |
| **Certifications** | ❌ None | ✅ Structured with expiry tracking |
| **CRM (Quotes)** | ✅ Full system | ❌ Not planned |
| **CRM (Invoices)** | ✅ Full system | ❌ Not planned |
| **Lead Management** | ✅ Full system | ❌ Not planned |
| **Job Tracking** | ✅ Basic system | ❌ Not planned |
| **Reviews** | ✅ Full system | ❌ Not planned |
| **Applications** | ✅ Workflow | ❌ Manual process assumed |
| **Public Profile** | ✅ Rich profile | ❌ Not built yet |
| **Availability Calendar** | ✅ Public calendar | ❌ Not planned |
| **Documents** | ✅ Generic uploads | ✅ Policy/cert specific |
| **Subscription Billing** | ✅ Stripe recurring | ✅ Stripe recurring |
| **Database** | SQLite (file-based) | PostgreSQL (production) |
| **Auth System** | JWT tokens | NextAuth sessions |

---

## Key Differences Explained

### 1. Insurance & Certification (Your Strength)

**Your Next.js Project:**
```prisma
model InsurancePolicy {
  id              String    @id @default(cuid())
  traderId        String
  policyType      String    
  policyNumber    String
  provider        String
  coverageAmount  Decimal
  startDate       DateTime
  expiryDate      DateTime  ⭐ Critical field
  documentUrl     String?   
  notified30Days  Boolean   @default(false)  ⭐ Automated alerts
  notified60Days  Boolean   @default(false)
  notified90Days  Boolean   @default(false)
  
  @@index([expiryDate])  ⭐ Optimized for cron job
}
```

**Uploaded Code:**
```
❌ No equivalent model
❌ No insurance expiry tracking
❌ No automated monitoring
```

### 2. CRM & Lead Management (Their Strength)

**Uploaded Code:**
```prisma
model MemberQuote {
  lineItems   Json  // Products/services
  totalPence  Int
  vatPence    Int
  sentToCustomer Boolean
  acceptedAt  DateTime?
}

model Lead {
  customerName   String
  customerEmail  String
  jobDescription String
  postcode       String
  assignedTo     Member?
}
```

**Your Project:**
```
❌ No CRM features
❌ No quote system
❌ No lead management
```

### 3. Public Profile (Their Strength)

**Uploaded Code:**
```prisma
model Member {
  slug          String  @unique  // tradeverify.today/m/john-smith
  tvId          String  @unique  // TV-1234
  blurb         String           // Public description
  vettingItems  Json?            // Structured checks display
  profileLogoStoredName String?  // Company logo
  
  reviews       MemberReview[]   // Customer reviews
  availabilityDays MemberAvailabilityDay[]  // Public calendar
}
```

**Your Project:**
```
❌ No public profile structure
❌ No review system
❌ No availability calendar
```

---

## Can We Merge Them?

### Option 1: Add Insurance to Uploaded Code ✅ Easier

**What to add:**
```prisma
// Add to /server/prisma/schema.prisma

model InsurancePolicy {
  id              String   @id @default(cuid())
  memberId        String   // Link to Member, not Trader
  policyType      String
  policyNumber    String
  provider        String
  coverageAmount  Int      // SQLite doesn't have Decimal
  startDate       DateTime
  expiryDate      DateTime
  documentPath    String?
  notified30Days  Boolean  @default(false)
  notified60Days  Boolean  @default(false)
  notified90Days  Boolean  @default(false)
  member          Member   @relation(fields: [memberId], references: [id])
  
  @@index([expiryDate])
}

model Certification {
  id         String   @id @default(cuid())
  memberId   String
  name       String
  number     String
  issuer     String
  issueDate  DateTime
  expiryDate DateTime?
  documentPath String?
  member     Member   @relation(fields: [memberId], references: [id])
}
```

Then add your cron job from `/app/api/cron/check-expiry/route.ts` to the Express backend.

**Effort:** Low (2-3 days)

---

### Option 2: Add CRM to Your Next.js Project ⚠️ More Work

**What to add:**
```prisma
// Add to /prisma/schema.prisma

model Lead {
  id              String   @id @default(cuid())
  customerName    String
  customerEmail   String
  customerPhone   String?
  jobDescription  String
  postcode        String
  traderId        String?
  trader          Trader?  @relation(fields: [traderId], references: [id])
  status          String   // "new", "assigned", "quoted", "closed"
  createdAt       DateTime @default(now())
}

model Quote {
  id           String   @id @default(cuid())
  traderId     String
  trader       Trader   @relation(fields: [traderId], references: [id])
  leadId       String?
  customerName String
  customerEmail String
  lineItems    Json     // [{desc, qty, price}]
  totalAmount  Decimal
  vatAmount    Decimal
  sentAt       DateTime?
  acceptedAt   DateTime?
  createdAt    DateTime @default(now())
}

model Invoice {
  id            String   @id @default(cuid())
  traderId      String
  trader        Trader   @relation(fields: [traderId], references: [id])
  invoiceNumber String   @unique
  customerName  String
  lineItems     Json
  totalAmount   Decimal
  vatAmount     Decimal
  paidAt        DateTime?
  createdAt     DateTime @default(now())
}
```

Then rebuild all the UI from `/src/member/MemberQuotes.tsx`, etc.

**Effort:** High (2-3 weeks)

---

## Meeting Strategy: Schema Questions

### Ask Nigel:

1. **"What's more important to you?"**
   - Insurance expiry monitoring + compliance?
   - OR lead generation + CRM + quotes?

2. **"Are you currently managing insurance expiry manually?"**
   - If yes → Your Next.js focus is valuable
   - If no → Maybe not a priority

3. **"Do you need a CRM for managing customer quotes?"**
   - If yes → Uploaded code is valuable
   - If no → Don't build unnecessary features

4. **"Are there existing members in the database?"**
   - If yes → Must use uploaded schema
   - If no → Fresh start with your schema

---

## Recommendation for Meeting

**Show Nigel both schemas side-by-side** and ask:

> "I've reviewed the source code, and I can see it's built for lead generation and CRM, while my proposal focused on insurance compliance monitoring. 
> 
> Which is more important for your business: 
> - Automated insurance expiry alerts and certification tracking? 
> - Or customer lead management and quote generation?
> 
> Or do you need both?"

Then price accordingly:
- **Just insurance tracking on uploaded code:** +£400-600
- **Just CRM on your Next.js project:** +£1,500-2,000
- **Both features, either platform:** +£2,000-2,500

---

## Bottom Line

These are **two different platforms for two different business models:**

1. **Uploaded Code** = Trader verification platform with lead generation/CRM
2. **Your Project** = Insurance compliance monitoring with subscription billing

The "right" choice depends on what Nigel's actual business needs are.

**Most likely scenario:** He wants **both** features, which means either:
- Add insurance to the uploaded code (faster)
- Add CRM to your Next.js project (cleaner architecture)

Be prepared to discuss both options tomorrow! 📊
