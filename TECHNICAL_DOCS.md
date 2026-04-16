# Trader Watchdog - Technical Documentation

**Last Updated:** April 15, 2026  
**Progress:** ~75% Complete (Modules 1-2 complete, Module 3 complete)

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Database Schema](#database-schema)
4. [Backend Structure](#backend-structure)
5. [Frontend Structure](#frontend-structure)
6. [Key Features](#key-features)
7. [API Endpoints](#api-endpoints)
8. [Common Patterns](#common-patterns)

---

## 🎯 Project Overview

**Trader Watchdog** is a verification platform for trade professionals (electricians, plumbers, etc.). The system:
- Verifies traders' insurance and credentials
- Sends automated expiry alerts (90/60/30 days before expiry)
- Provides grace period management (14 days after expiry)
- Auto-removes expired members from the directory
- Displays verified traders in a public-facing directory

**Client:** Nigel  
**Budget:** £2,300  
**Deadline:** End of May 2026  
**Brand Name:** Trader Watchdog 🐕

---

## 🛠️ Tech Stack

### Backend (Express Server)
- **Runtime:** Node.js 24.14.0
- **Framework:** Express 4.21.2
- **Language:** TypeScript (transpiled to JavaScript)
- **Database ORM:** Prisma 6.19.2
- **Database:** SQLite (dev.db)
- **Authentication:** JWT tokens
- **Email:** nodemailer
- **Build:** `npm run build` → compiles TypeScript to `dist/`

### Frontend (Vite + React)
- **Framework:** React 18.3
- **Build Tool:** Vite 8.0.3
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

### Key Directories
```
tradeverify/
├── server/                 # Backend Express API
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── db.ts          # Prisma client
│   │   ├── routes/        # API route handlers
│   │   ├── lib/           # Business logic & utilities
│   │   └── middleware/    # Auth middleware
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── dist/              # Compiled JavaScript (git ignored)
│   └── dev.db             # SQLite database (git ignored)
├── src/                   # Frontend React app
├── app/                   # Shared types/components
└── dist/                  # Frontend build output
```

---

## 🗄️ Database Schema

### Core Models

#### **Member**
Represents a verified trader (electrician, plumber, etc.)

**Key Fields:**
- `id`: Unique identifier (cuid)
- `name`: Business/trader name
- `loginEmail`: Email for member portal access
- `categories`: Business categories (many-to-many)
- `insurancePolicies`: Array of insurance policies (one-to-many)
- `membershipExpiry`: Subscription expiry date
- `isVerified`: Public visibility flag

**Relations:**
```prisma
model Member {
  id                String      @id @default(cuid())
  name              String
  loginEmail        String?     @unique
  categories        Category[]
  insurancePolicies Insurance[]
  // ... other fields
}
```

---

#### **Category**
Business categories for traders (Plumber, Electrician, Roofer, etc.)

**Key Fields:**
- `id`: Unique identifier (cuid)
- `name`: Category name (e.g., "Plumber")
- `slug`: URL-friendly version (e.g., "plumber")
- `members`: Traders in this category

**Relations:**
```prisma
model Category {
  id      String   @id @default(cuid())
  name    String   @unique
  slug    String   @unique
  members Member[]
}
```

**CRUD:** Module 2 (Sessions 1-2)

---

#### **Insurance** 🔥 **Core Feature**
Insurance policies with expiry tracking and automated alerts

**Key Fields:**
- `id`: Unique identifier (cuid)
- `memberId`: Foreign key to Member
- `type`: Insurance type (e.g., "Public Liability", "Employers Liability")
- `provider`: Insurance company name
- `policyNumber`: Policy reference number
- `expiryDate`: When insurance expires
- `graceExpiryDate`: 14 days after expiry (calculated automatically)
- `status`: Current state (active/expiring_soon/in_grace/expired)
- `alertsSent`: JSON object tracking sent alerts
- `lastAlertSentAt`: Timestamp of most recent alert

**Status Logic:**
```typescript
// Status calculation (automatic via cron)
if (daysUntilExpiry > 90) → "active"
if (daysUntilExpiry <= 90) → "expiring_soon"
if (expired && within grace period) → "in_grace"
if (expired && past grace period) → "expired"
```

**Alert Tracking:**
```json
{
  "90days": "2026-02-08T22:16:55.346Z",  // Sent 90 days before expiry
  "60days": "2026-03-10T22:16:55.367Z",  // Sent 60 days before expiry
  "30days": "2026-04-09T22:16:55.367Z",  // Sent 30 days before expiry
  "grace": null                           // Sent when enters grace period
}
```

**Relations:**
```prisma
model Insurance {
  id                String    @id @default(cuid())
  memberId          String
  member            Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  type              String
  provider          String?
  policyNumber      String?
  expiryDate        DateTime
  graceExpiryDate   DateTime?
  status            String    @default("active")
  alertsSent        Json?
  lastAlertSentAt   DateTime?
  documentStoredName String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@index([memberId])
  @@index([status])
  @@index([expiryDate])
}
```

**CRUD:** Module 3 Sessions 1-2  
**Alerts:** Module 3 Session 3  
**Automation:** Module 3 Session 4

---

#### **OrganizationSettings**
Global settings for the platform

**Key Fields:**
- `id`: Always "default" (singleton)
- `siteDisplayName`: Brand name ("Trader Watchdog")
- `smtpHost`, `smtpPort`, etc.: Email configuration
- `stripePublishableKey`, `stripeSecretKey`: Payment config

---

## 🔧 Backend Structure

### Entry Point: `server/src/index.ts`

**Purpose:** Express server initialization and route registration

**Key Code:**
```typescript
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import insuranceRouter from "./routes/insurance.js";
import cronRouter from "./routes/cron.js";
// ... other imports

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// Route registration
app.use("/api/auth", authRouter);
app.use("/api/insurance", insuranceRouter);
app.use("/api/cron", cronRouter);
// ... other routes

app.listen(3001, () => console.log("Server running on port 3001"));
```

**Registered Routes:**
- `/api/auth` → Authentication (login/register)
- `/api/member-auth` → Member portal auth
- `/api/admin` → Admin operations
- `/api/categories` → Business categories CRUD
- `/api/insurance` → Insurance policy management
- `/api/cron` → Automated cron jobs
- `/api/billing` → Stripe payments
- `/api` → Public API (directory listings)

---

### Database Client: `server/src/db.ts`

**Purpose:** Shared Prisma client instance

**Key Code:**
```typescript
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

**Usage Pattern:**
```typescript
// Import in any file
import { prisma } from "../db.js";

// Query database
const members = await prisma.member.findMany();
const insurance = await prisma.insurance.create({ data: {...} });
```

---

### Routes Directory: `server/src/routes/`

#### **categories.ts** (Module 2)
**Purpose:** Business category CRUD operations

**Endpoints:**
- `GET /api/categories` → List all categories (public)
- `POST /api/categories` → Create category (staff only)
- `PUT /api/categories/:id` → Update category (staff only)
- `DELETE /api/categories/:id` → Delete category (staff only)

**Key Methods:**
```typescript
import { Router } from "express";
import { requireStaff } from "../middleware/requireStaff.js";

const router = Router();

// Public endpoint (no auth)
router.get("/", async (req, res) => {
  const categories = await prisma.category.findMany();
  res.json(categories);
});

// Protected endpoint (staff only)
router.post("/", requireStaff, async (req, res) => {
  const { name } = req.body;
  const category = await prisma.category.create({
    data: { name, slug: slugify(name) }
  });
  res.json(category);
});
```

**Authentication Pattern:**
- `requireStaff` middleware checks JWT token
- Rejects unauthorized requests with 401/403

---

#### **insurance.ts** (Module 3 Sessions 1-2)
**Purpose:** Insurance policy CRUD with automatic grace period calculation

**Endpoints:**
- `GET /api/insurance/:memberId` → List member's policies (staff only)
- `POST /api/insurance` → Create policy (staff only)
- `PUT /api/insurance/:id` → Update policy (staff only)
- `DELETE /api/insurance/:id` → Delete policy (staff only)
- `POST /api/insurance/:id/send-alert` → Manual alert trigger (staff only)

**Key Logic:**
```typescript
// Grace period calculation (14 days after expiry)
const expiryDate = new Date(req.body.expiryDate);
const graceExpiryDate = new Date(expiryDate);
graceExpiryDate.setDate(graceExpiryDate.getDate() + 14);

// Status determination
const today = new Date();
const daysUntilExpiry = Math.floor(
  (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
);

let status = "active";
if (daysUntilExpiry <= 90) status = "expiring_soon";
if (daysUntilExpiry < 0) {
  const daysUntilGraceExpiry = Math.floor(
    (graceExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  status = daysUntilGraceExpiry >= 0 ? "in_grace" : "expired";
}

// Create insurance with calculated fields
await prisma.insurance.create({
  data: {
    memberId,
    type,
    provider,
    policyNumber,
    expiryDate,
    graceExpiryDate,
    status,
    alertsSent: {},
  }
});
```

---

#### **cron.ts** (Module 3 Session 4)
**Purpose:** Daily cron job for automated insurance checks

**Endpoints:**
- `POST /api/cron/check-insurance` → Run daily automation (Bearer token protected)

**Key Code:**
```typescript
router.post("/check-insurance", async (req, res) => {
  // Verify authorization
  const cronSecret = process.env.CRON_SECRET || "dev-secret-123";
  const authHeader = req.headers.authorization;
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Run automation
  const results = await checkInsuranceExpiries();
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    results  // { checked, alertsSent, statusesUpdated }
  });
});
```

**Security:**
- Requires `CRON_SECRET` environment variable
- Called by Vercel Cron (configured in vercel.json)
- Prevents unauthorized automation triggers

---

#### **apiAdmin.ts** (Module 3 Session 5)
**Purpose:** Admin-specific API endpoints (staff-only operations)

**Endpoints:**
- `GET /api/admin/insurance/all` → Get all insurance policies across all members

**Key Code:**
```typescript
import { Router } from "express";
import { requireStaff } from "../middleware/requireStaff.js";
import { prisma } from "../db.js";

const router = Router();

// All routes protected by requireStaff middleware
router.use(requireStaff);

/** Insurance */
router.get("/insurance/all", async (_req, res) => {
  try {
    // Query all policies with member data JOIN
    const policies = await prisma.insurance.findMany({
      include: {
        member: {
          select: { id: true, name: true }
        }
      },
      orderBy: { updatedAt: "desc" }
    });
    
    // Format response with ISO dates
    res.json({
      policies: policies.map((p) => ({
        id: p.id,
        memberId: p.memberId,
        memberName: p.member.name,  // From JOIN
        type: p.type,
        provider: p.provider,
        policyNumber: p.policyNumber,
        expiryDate: p.expiryDate.toISOString(),
        graceExpiryDate: p.graceExpiryDate?.toISOString() ?? null,
        status: p.status,
        alertsSent: p.alertsSent,
        lastAlertSentAt: p.lastAlertSentAt?.toISOString() ?? null,
        updatedAt: p.updatedAt.toISOString(),
      })),
      totalCount: policies.length,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not list insurance policies" });
  }
});

export default router;
```

**Key Features:**
- Protected by `requireStaff` middleware (JWT required)
- Returns ALL policies (differs from `/api/insurance/:memberId` which is single-member)
- Includes member names via JOIN (avoids N+1 queries on frontend)
- Used by StaffInsurance.tsx dashboard

---

### Lib Directory: `server/src/lib/`

#### **insuranceAlerts.ts** (Module 3 Sessions 3-4)
**Purpose:** Email alert system with automation

**Key Exports:**

##### `sendInsuranceAlertEmail(insuranceId, alertType)`
Sends a single alert email and updates tracking

**Parameters:**
- `insuranceId`: Insurance policy ID
- `alertType`: `"90days"` | `"60days"` | `"30days"` | `"grace"`

**Key Logic:**
```typescript
export async function sendInsuranceAlertEmail(
  insuranceId: string,
  alertType: "90days" | "60days" | "30days" | "grace"
): Promise<boolean> {
  // 1. Get insurance + member data
  const insurance = await prisma.insurance.findUnique({
    where: { id: insuranceId },
    include: { member: { select: { name: true, loginEmail: true } } }
  });

  // 2. Calculate days until expiry
  const daysUntil = Math.floor(
    (new Date(insurance.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // 3. Generate email content
  const { subject, html, text } = generateAlertEmail(
    insurance.member.name,
    insurance.type,
    insurance.expiryDate,
    daysUntil,
    "Trader Watchdog"
  );

  // 4. Send email via nodemailer
  const transport = await getTransport();
  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: insurance.member.loginEmail,
    subject,
    html,
    text
  });

  // 5. Update alertsSent tracking (prevents duplicates)
  const currentAlerts = (insurance.alertsSent as AlertsSent) || {};
  currentAlerts[alertType] = new Date().toISOString();

  await prisma.insurance.update({
    where: { id: insuranceId },
    data: {
      alertsSent: currentAlerts as any,
      lastAlertSentAt: new Date()
    }
  });

  return true;
}
```

**Email Templates:**
- **90-day warning:** "90-Day Notice: [Type] Expiry"
- **60-day warning:** "60-Day Notice: [Type] Expiry"
- **30-day warning:** "⚠️ 30-Day Final Notice: [Type] Expiry"
- **Grace alert:** "🚨 URGENT: Grace Period Active"

---

##### `checkInsuranceExpiries()`
Daily automation function that checks all policies

**Returns:**
```typescript
{
  checked: number;        // Total policies examined
  alertsSent: number;     // Emails sent this run
  statusesUpdated: number; // Status changes made
}
```

**Key Logic:**
```typescript
export async function checkInsuranceExpiries() {
  // 1. Get all non-expired policies
  const policies = await prisma.insurance.findMany({
    where: { status: { in: ["active", "expiring_soon", "in_grace"] } },
    include: { member: true }
  });

  let alertsSent = 0;
  let statusesUpdated = 0;

  for (const policy of policies) {
    // 2. Calculate days until expiry
    const daysUntilExpiry = Math.floor(
      (new Date(policy.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // 3. Determine new status
    let newStatus = "active";
    if (daysUntilExpiry < 0) {
      // Check grace period
      const daysUntilGrace = Math.floor(
        (new Date(policy.graceExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      newStatus = daysUntilGrace < 0 ? "expired" : "in_grace";
    } else if (daysUntilExpiry <= 90) {
      newStatus = "expiring_soon";
    }

    // 4. Update status if changed
    if (newStatus !== policy.status) {
      await prisma.insurance.update({
        where: { id: policy.id },
        data: { status: newStatus }
      });
      statusesUpdated++;
    }

    // 5. Send alerts at exact thresholds
    const alerts = (policy.alertsSent as AlertsSent) || {};
    
    if (daysUntilExpiry === 90 && !alerts["90days"]) {
      await sendInsuranceAlertEmail(policy.id, "90days");
      alertsSent++;
    }
    
    if (daysUntilExpiry === 60 && !alerts["60days"]) {
      await sendInsuranceAlertEmail(policy.id, "60days");
      alertsSent++;
    }
    
    if (daysUntilExpiry === 30 && !alerts["30days"]) {
      await sendInsuranceAlertEmail(policy.id, "30days");
      alertsSent++;
    }
    
    if (newStatus === "in_grace" && !alerts["grace"]) {
      await sendInsuranceAlertEmail(policy.id, "grace");
      alertsSent++;
    }
  }

  return { checked: policies.length, alertsSent, statusesUpdated };
}
```

**Duplicate Prevention:**
- Checks `alertsSent` JSON object before sending
- Only sends if specific alert type not already sent
- Tracks ISO timestamp of each alert

---

#### **adminMail.ts**
**Purpose:** Email transport configuration and brand name lookup

**Key Exports:**

```typescript
// Get nodemailer transport from environment variables
export async function getTransport(): Promise<nodemailer.Transporter | null> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Get brand name from database (fallback: "Trader Watchdog")
export async function getBrandName(prisma: PrismaClient): Promise<string> {
  const settings = await prisma.organizationSettings.findUnique({
    where: { id: "default" }
  });
  return settings?.siteDisplayName || "Trader Watchdog";
}
```

**Environment Variables:**
- `SMTP_HOST`: Mail server hostname
- `SMTP_PORT`: Mail server port (default: 587)
- `SMTP_SECURE`: Use SSL/TLS (default: false)
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `EMAIL_FROM`: Sender email address

---

### Middleware: `server/src/middleware/`

#### **requireStaff.ts**
**Purpose:** JWT authentication middleware for admin endpoints

**Key Code:**
```typescript
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

export async function requireStaff(req, res, next) {
  // 1. Extract JWT from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7);

  // 2. Verify JWT signature
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  // 3. Check user role is "staff"
  if (decoded.role !== "staff") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // 4. Attach user to request
  req.user = decoded;
  next();
}
```

**Usage Pattern:**
```typescript
// Protect endpoint with middleware
router.post("/", requireStaff, async (req, res) => {
  // Only staff users can reach this code
  // req.user contains decoded JWT payload
});
```

---

## 🎨 Frontend Structure

### Key Directories
```
src/               # React application
├── main.tsx      # Entry point
├── App.tsx       # Root component with routing
├── staff/        # Staff admin panel pages
│   ├── StaffLayout.tsx
│   ├── StaffMembers.tsx
│   └── StaffInsurance.tsx  # Session 5 (insurance dashboard)
├── admin/        # Admin dashboard pages
│   └── AdminLayout.tsx
├── member/       # Member portal pages
│   └── MemberLayout.tsx
├── public/       # Public directory pages
└── components/   # Shared components
```

---

### Staff Pages: `src/staff/`

#### **StaffInsurance.tsx** (Module 3 Session 5)
**Purpose:** Insurance dashboard for staff to view/manage all policies

**Capabilities:**
- View all insurance policies across all members
- Search by member name, type, provider, policy number
- Sort by urgency (expired first → in_grace → expiring_soon → active)
- Color-coded status badges
- Days until expiry indicators with emojis
- Send manual alerts (90/60/30 days, grace)
- Track alert history

**Key Components:**

**Main Component:**
```tsx
export function StaffInsurance() {
  const [policies, setPolicies] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(""); // Search
  
  // Fetch data
  useEffect(() => {
    apiGetAuth<ApiResponse>("/api/admin/insurance/all")
      .then(d => setPolicies(d.policies))
      .finally(() => setLoading(false));
  }, []);
  
  // Filter by search query
  const filtered = useMemo(() => {
    if (!query.trim()) return policies;
    const q = query.toLowerCase();
    return policies.filter(p =>
      p.memberName.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      p.provider?.toLowerCase().includes(q) ||
      p.policyNumber?.toLowerCase().includes(q)
    );
  }, [policies, query]);
  
  // Sort by urgency
  const sorted = useMemo(() => {
    const statusOrder = { 
      expired: 0, in_grace: 1, expiring_soon: 2, active: 3 
    };
    return [...filtered].sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      return statusDiff !== 0 ? statusDiff : 
        daysUntil(a.expiryDate) - daysUntil(b.expiryDate);
    });
  }, [filtered]);
  
  // Render table...
}
```

**Helper Components:**
- `StatusBadge` → Color-coded status (green/yellow/orange/red)
- `DaysIndicator` → Days until expiry with urgency emojis
- `AlertsIndicator` → Shows alert count

**Routing:**
- Path: `/staff/insurance`
- Registered in: `src/App.tsx`
- Nav link in: `src/staff/StaffLayout.tsx`

---

### Components: `components/ui/`

#### **Button.tsx**
Reusable button component with variants

**Usage:**
```tsx
<Button onClick={handleClick}>Save</Button>
<Button variant="secondary">Cancel</Button>
```

#### **Card.tsx**
Container component for content sections

**Usage:**
```tsx
<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Body content</CardContent>
</Card>
```

---

## 🔑 Key Features

### 1. Business Categories (Module 2)
**Status:** ✅ Complete

**Description:** Manage trader categories (Plumber, Electrician, etc.)

**Key Files:**
- `server/src/routes/categories.ts` - CRUD API
- `server/prisma/schema.prisma` - Category model

**Capabilities:**
- List all categories (public)
- Create/update/delete categories (admin only)
- Many-to-many relation with members

**Test Data:**
- 5 categories created (Plumber, Electrician, Gas Engineer, Roofer, Builder)

---

### 2. Insurance Tracking (Module 3 Sessions 1-2)
**Status:** ✅ Complete

**Description:** Track insurance policies with expiry dates and grace periods

**Key Files:**
- `server/src/routes/insurance.ts` - CRUD API
- `server/prisma/schema.prisma` - Insurance model

**Capabilities:**
- Create/read/update/delete insurance policies
- Automatic grace period calculation (14 days)
- Status management (active/expiring_soon/in_grace/expired)
- Document storage support

**Business Rules:**
- Grace period: 14 days after expiry
- Status transitions:
  - `active` → >90 days until expiry
  - `expiring_soon` → ≤90 days until expiry
  - `in_grace` → Expired but within 14 days
  - `expired` → Past grace period

**Test Data:**
- 5 policies for test member "Riverside Electrical Ltd"
- All 4 statuses represented

---

### 3. Alert System (Module 3 Session 3)
**Status:** ✅ Complete

**Description:** Automated email alerts for approaching insurance expiries

**Key Files:**
- `server/src/lib/insuranceAlerts.ts` - Email logic
- `server/src/routes/insurance.ts` - Manual trigger endpoint

**Capabilities:**
- Email generation with HTML/text templates
- Alert intervals: 90, 60, 30 days before expiry
- Grace period alert (urgent notification)
- Duplicate prevention via JSON tracking
- Manual alert testing endpoint

**Alert Types:**
1. **90-day warning** - "Your insurance expires in 90 days"
2. **60-day warning** - "Your insurance expires in 60 days"
3. **30-day warning** - "⚠️ Final notice: 30 days remaining"
4. **Grace alert** - "🚨 URGENT: Insurance expired, grace period active"

**Tracking Mechanism:**
```json
// Stored in insurance.alertsSent field
{
  "90days": "2026-02-08T22:16:55.346Z",  // ISO timestamp
  "60days": "2026-03-10T22:16:55.367Z",
  "30days": "2026-04-09T22:16:55.367Z",
  "grace": null
}
```

---

### 4. Automation System (Module 3 Session 4)
**Status:** ✅ Complete

**Description:** Daily cron job that checks all policies and sends alerts

**Key Files:**
- `server/src/lib/insuranceAlerts.ts` - `checkInsuranceExpiries()` function
- `server/src/routes/cron.ts` - Cron endpoint

**Capabilities:**
- Daily policy checks (all non-expired policies)
- Automatic status updates
- Alert sending at exact thresholds
- Duplicate prevention
- Summary reporting (checked/sent/updated counts)

**Cron Job Endpoint:**
```
POST /api/cron/check-insurance
Authorization: Bearer {CRON_SECRET}
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-04-10T08:45:37.164Z",
  "results": {
    "checked": 4,
    "alertsSent": 0,
    "statusesUpdated": 1
  }
}
```

**Deployment:**
- Vercel Cron (runs daily at midnight)
- Configuration in `vercel.json`

**Test Results:**
- ✅ Checked 4 policies on 2026-04-10
- ✅ Updated 1 status (Public Liability → expiring_soon)
- ✅ No alerts sent (no policies at exact thresholds)

---

### 5. Admin Insurance Dashboard (Module 3 Session 5)
**Status:** ✅ Complete

**Description:** Staff admin panel to view and manage all insurance policies across all members

**Key Files:**
- `server/src/routes/apiAdmin.ts` - Admin API endpoint
- `src/staff/StaffInsurance.tsx` - Dashboard UI component
- `src/App.tsx` - Route registration
- `src/staff/StaffLayout.tsx` - Navigation link

**Capabilities:**
- View all insurance policies across all members (in one table)
- Search by member name, type, provider, or policy number
- Sort by urgency (expired → in_grace → expiring_soon → active)
- Color-coded status badges (green/yellow/orange/red)
- Days until expiry with urgency icons (✅ ⏰ ⚠️ 🚨 ❌)
- Alert tracking display (shows count of alerts sent)
- Manual alert sending buttons for each policy
- English date format (DD/MM/YYYY)

**Backend Endpoint:**
```
GET /api/admin/insurance/all
Authorization: Bearer {JWT}
```

**Response:**
```json
{
  "policies": [
    {
      "id": "policy_123",
      "memberId": "member_456",
      "memberName": "Riverside Electrical Ltd",
      "type": "Public Liability Insurance",
      "provider": "Zurich",
      "policyNumber": "PL-2026-12345",
      "expiryDate": "2026-12-31T00:00:00.000Z",
      "graceExpiryDate": "2027-01-14T00:00:00.000Z",
      "status": "expiring_soon",
      "alertsSent": { "90days": "2026-02-08T22:16:55.346Z" },
      "lastAlertSentAt": "2026-02-08T22:16:55.346Z",
      "updatedAt": "2026-04-10T22:16:55.367Z"
    }
  ],
  "totalCount": 5
}
```

**Key Frontend Components:**

**StatusBadge Component:**
```tsx
// Maps status to color scheme
active: "bg-green-500/20 text-green-300"
expiring_soon: "bg-yellow-500/20 text-yellow-300"
in_grace: "bg-orange-500/20 text-orange-300"
expired: "bg-red-500/20 text-red-300"
```

**DaysIndicator Component:**
```tsx
// Shows days until expiry with urgency icons
>90 days: ✅ X days (green)
60-90 days: ⏰ X days (yellow)
30-60 days: ⚠️ X days (orange)
<30 days: 🚨 X days (red)
In grace: ⚠️ Grace: X days left (orange)
Expired: ❌ Expired X days ago (red)
```

**Test Results:**
- ✅ API tested on 2026-04-15 (returns 5 policies)
- ✅ Data includes member names via JOIN
- ✅ ISO date conversion working
- ✅ Frontend UI compiled without errors
- ⏳ UI pending user testing (awaiting staff login)

---

## 📡 API Endpoints

### Categories API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/categories` | Public | List all categories |
| POST | `/api/categories` | Staff | Create category |
| PUT | `/api/categories/:id` | Staff | Update category |
| DELETE | `/api/categories/:id` | Staff | Delete category |

---

### Insurance API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/insurance/:memberId` | Staff | Get member's policies |
| POST | `/api/insurance` | Staff | Create policy |
| PUT | `/api/insurance/:id` | Staff | Update policy |
| DELETE | `/api/insurance/:id` | Staff | Delete policy |
| POST | `/api/insurance/:id/send-alert` | Staff | Manual alert trigger |

**POST /api/insurance** body:
```json
{
  "memberId": "cmnjcfabl0001jv48lfegube7",
  "type": "Public Liability Insurance",
  "provider": "Zurich",
  "policyNumber": "PL-2026-12345",
  "expiryDate": "2026-12-31"
}
```

**POST /api/insurance/:id/send-alert** body:
```json
{
  "alertType": "90days"  // or "60days", "30days", "grace"
}
```

---

### Admin Insurance API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/insurance/all` | Staff | Get ALL insurance policies (all members) |

**GET /api/admin/insurance/all** response:
```json
{
  "policies": [
    {
      "id": "cmnjcfabl0001jv48lfegube7",
      "memberId": "member_123",
      "memberName": "Riverside Electrical Ltd",
      "type": "Public Liability Insurance",
      "provider": "Zurich",
      "policyNumber": "PL-2026-12345",
      "expiryDate": "2026-12-31T00:00:00.000Z",
      "graceExpiryDate": "2027-01-14T00:00:00.000Z",
      "status": "expiring_soon",
      "alertsSent": { "90days": "2026-02-08T22:16:55.346Z" },
      "lastAlertSentAt": "2026-02-08T22:16:55.346Z",
      "updatedAt": "2026-04-10T22:16:55.367Z"
    }
  ],
  "totalCount": 5
}
```

**Key Features:**
- Includes member names via JOIN (no extra queries needed)
- Returns all policies across all members (admin overview)
- Used by StaffInsurance.tsx dashboard component

---

### Cron API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/cron/check-insurance` | Bearer Token | Run daily automation |

**Authorization:**
```
Authorization: Bearer {CRON_SECRET}
```

---

## 🎓 Common Patterns

### Prisma Query Patterns

#### **Find One**
```typescript
const member = await prisma.member.findUnique({
  where: { id: memberId }
});
```

#### **Find Many with Filter**
```typescript
const policies = await prisma.insurance.findMany({
  where: {
    memberId: "abc123",
    status: "expiring_soon"
  },
  orderBy: { expiryDate: "asc" }
});
```

#### **Create**
```typescript
const insurance = await prisma.insurance.create({
  data: {
    memberId: "abc123",
    type: "Public Liability",
    expiryDate: new Date("2026-12-31"),
    status: "active"
  }
});
```

#### **Update**
```typescript
await prisma.insurance.update({
  where: { id: insuranceId },
  data: {
    status: "expiring_soon",
    alertsSent: { "90days": new Date().toISOString() }
  }
});
```

#### **Delete**
```typescript
await prisma.insurance.delete({
  where: { id: insuranceId }
});
```

#### **Include Relations**
```typescript
const insurance = await prisma.insurance.findUnique({
  where: { id: insuranceId },
  include: {
    member: {
      select: { name: true, loginEmail: true }
    }
  }
});

// Access: insurance.member.name
```

---

### Express Route Patterns

#### **Basic Route**
```typescript
router.get("/", async (req, res) => {
  try {
    const data = await prisma.model.findMany();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});
```

#### **Route with Middleware**
```typescript
router.post("/", requireStaff, async (req, res) => {
  // Only authenticated staff can access
  const { field } = req.body;
  // ... create logic
});
```

#### **Route with Params**
```typescript
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const record = await prisma.model.findUnique({ where: { id } });
  res.json(record);
});
```

#### **Route with Body Validation**
```typescript
router.post("/", async (req, res) => {
  const { name, email } = req.body;
  
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Invalid name" });
  }
  
  // ... create logic
});
```

---

### TypeScript Type Patterns

#### **Interface for Alert Tracking**
```typescript
interface AlertsSent {
  "90days"?: string;  // ISO timestamp
  "60days"?: string;
  "30days"?: string;
  "grace"?: string;
}
```

#### **Function with Return Type**
```typescript
async function checkInsuranceExpiries(): Promise<{
  checked: number;
  alertsSent: number;
  statusesUpdated: number;
}> {
  // ... implementation
  return { checked, alertsSent, statusesUpdated };
}
```

#### **JSON Type Casting**
```typescript
// Prisma returns Json type, cast to interface
const alerts = (insurance.alertsSent as AlertsSent) || {};

// Update with cast to any (avoids type errors)
await prisma.insurance.update({
  data: {
    alertsSent: alerts as any
  }
});
```

---

### React/Frontend Patterns

#### **Component with useState and useEffect**
```tsx
import { useState, useEffect } from "react";
import { apiGetAuth } from "../lib/api";

export function StaffInsurance() {
  const [policies, setPolicies] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    apiGetAuth<ApiResponse>("/api/admin/insurance/all")
      .then(d => setPolicies(d.policies))
      .finally(() => setLoading(false));
  }, []); // Empty deps = run once on mount
  
  return <div>{/* render */}</div>;
}
```

#### **Search/Filter with useMemo**
```tsx
import { useMemo } from "react";

const filtered = useMemo(() => {
  if (!query.trim()) return policies;
  const q = query.toLowerCase();
  return policies.filter(p =>
    p.memberName.toLowerCase().includes(q) ||
    p.type.toLowerCase().includes(q)
  );
}, [policies, query]); // Recompute when deps change
```

#### **Custom Sorting Logic**
```tsx
const sorted = useMemo(() => {
  return [...filtered].sort((a, b) => {
    // Sort by urgency: expired > in_grace > expiring_soon > active
    const statusOrder = { 
      expired: 0, 
      in_grace: 1, 
      expiring_soon: 2, 
      active: 3 
    };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    // Within same status, sort by days until expiry
    return daysUntil(a.expiryDate) - daysUntil(b.expiryDate);
  });
}, [filtered]);
```

#### **Date Formatting**
```tsx
// English date format (DD/MM/YYYY)
const formatted = new Date(dateString).toLocaleDateString('en-GB');

// Custom calculation
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);  // Normalize to midnight
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
```

#### **Status Badge Component**
```tsx
function StatusBadge({ status }: { status: Insurance["status"] }) {
  const styles = {
    active: "bg-green-500/20 text-green-300 border-green-500/30",
    expiring_soon: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    in_grace: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    expired: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  
  const labels = {
    active: "Active",
    expiring_soon: "Expiring Soon",
    in_grace: "Grace Period",
    expired: "Expired",
  };
  
  return (
    <span className={`px-2 py-1 rounded-full border text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
```

---

## 🚀 Development Workflow

### Starting Development

1. **Start Backend:**
```bash
cd server
npm run dev  # Watch mode with tsx
```

2. **Start Frontend:**
```bash
npm run dev  # Vite dev server
```

3. **Database Changes:**
```bash
cd server
npm run db:push  # Apply schema changes
```

### Building for Production

1. **Build Backend:**
```bash
cd server
npm run build  # Compile TypeScript to dist/
```

2. **Build Frontend:**
```bash
npm run build  # Vite build
```

3. **Start Production Server:**
```bash
cd server
npm start  # Run compiled JavaScript
```

---

## 📝 Testing

### Manual Testing (Current Approach)

**Admin Login:**
```bash
POST http://localhost:3001/api/auth/login
{
  "email": "admin@test.com",
  "password": "password123"
}
```

**Test Member:**
- ID: `cmnjcfabl0001jv48lfegube7`
- Name: "Riverside Electrical Ltd"
- Has 5 insurance policies (all statuses)

**Cron Test:**
```bash
POST http://localhost:3001/api/cron/check-insurance
Authorization: Bearer dev-secret-123
```

---

## 🔜 Upcoming Features

### Session 6: Member Portal Insurance UI (Next - Not Started)
- Member's own insurance view (not all policies)
- Days until expiry display
- Document upload interface
- Renewal reminders
- Mobile-responsive design

### Session 7: Sumsub Integration (Not Started)
- Identity verification API integration
- Document verification automation
- Webhook handling for verification events
- Admin review fallback for edge cases

### Polish & Deployment (Not Started)
- Edge case testing (expired documents, missing data)
- Performance optimization
- Production environment setup
- Vercel deployment with environment variables
- Email configuration (production SMTP)

---

## 📚 Additional Resources

- **Prisma Docs:** https://www.prisma.io/docs
- **Express Guide:** https://expressjs.com/en/guide/routing.html
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **React Docs:** https://react.dev
- **Vercel Cron:** https://vercel.com/docs/cron-jobs

---

**🐕 Trader Watchdog - Built with care for Nigel**
