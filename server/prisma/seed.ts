import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const seedFileDir = path.dirname(fileURLToPath(import.meta.url));
const serverEnvPath = path.join(seedFileDir, "..", ".env");
dotenv.config({ path: serverEnvPath });
dotenv.config();

const prisma = new PrismaClient();

const vettingRiverside = [
  {
    id: "identity",
    label: "Identity & location",
    items: [
      {
        id: "local-address",
        label: "Local business address",
        status: "verified",
        detail:
          "Trading address matches the advertised service area and supporting records on file.",
        facts: [
          { label: "Town / city", value: "Bristol" },
          {
            label: "Primary service area",
            value: "BS postcodes — city, north fringe, and advertised coverage",
          },
          {
            label: "On file",
            value:
              "Full street address verified with supporting evidence (not published on this page)",
          },
        ],
      },
      {
        id: "contact",
        label: "Contact number",
        status: "verified",
        detail: "Phone number verified as genuine and active.",
        value: "0117 496 0123",
        facts: [
          { label: "Line type", value: "UK number — routing and activity checked" },
          {
            label: "Matches",
            value: "Website, Google Business Profile, and materials on file",
          },
        ],
      },
      {
        id: "registration",
        label: "Business registration",
        status: "verified",
        detail:
          "Companies House and business registration details reviewed for an active UK trading entity.",
        facts: [
          { label: "Entity", value: "Limited company — status active on public record" },
          {
            label: "Cross-check",
            value: "Trading name and registered office consistent with marketing",
          },
        ],
      },
    ],
  },
  {
    id: "insurance",
    label: "Insurance & accreditations",
    items: [
      {
        id: "pl",
        label: "Public liability insurance",
        status: "verified",
        detail:
          "Policy documentation reviewed directly with the insurer or broker on file.",
        facts: [
          { label: "Cover type", value: "Public liability (and employers’ liability on file)" },
          { label: "Check method", value: "Insurer / broker confirmation against policy schedule" },
        ],
      },
      {
        id: "trade-accred",
        label: "Trade accreditations",
        status: "pending",
        detail:
          "NICEIC registration was not required for this profile at enrolment, or is still being confirmed. This row updates when scheme records are on file.",
        facts: [
          { label: "Scheme", value: "NICEIC (or equivalent) — pending or not claimed at enrolment" },
          { label: "Next step", value: "We’ll mark this verified when a valid registration is on file" },
        ],
      },
    ],
  },
  {
    id: "digital",
    label: "Digital footprint",
    items: [
      {
        id: "website",
        label: "Website",
        status: "verified",
        detail:
          "Live website reviewed for consistency with trading identity and contact details.",
        facts: [
          {
            label: "Site",
            value: "https://riverside-electrical.example.co.uk",
          },
          { label: "Checks", value: "HTTPS, trading name, phone, and area match our records" },
        ],
      },
      {
        id: "gbp",
        label: "Google Business Profile",
        status: "verified",
        detail:
          "Location and business details align with our address and trade confirmations.",
        facts: [
          {
            label: "Listing name",
            value: "Riverside Electrical Ltd — Electrician",
          },
          { label: "Maps area", value: "Bristol, England" },
          {
            label: "Parity",
            value: "Phone, category, and service area consistent with verification file",
          },
        ],
      },
      {
        id: "social",
        label: "Social media",
        status: "verified",
        detail:
          "Public profiles checked for alignment with the advertised business.",
        facts: [
          { label: "Facebook", value: "@RiversideElectricalBristol" },
          { label: "Instagram", value: "@riverside_electrical" },
          {
            label: "Note",
            value: "Handles, imagery, and locality cross-checked with the trading identity",
          },
        ],
      },
      {
        id: "reviews",
        label: "Online reviews",
        status: "verified",
        detail:
          "Review history sampled for patterns consistent with genuine local trade activity.",
        facts: [
          {
            label: "Google reviews",
            value: "Sampled recent history — ongoing local engagement pattern",
          },
          {
            label: "Other platforms",
            value: "Directory / trade-site presence checked where advertised",
          },
          {
            label: "Important",
            value:
              "We do not publish star ratings. We look for authenticity signals, not workmanship quality.",
          },
        ],
      },
    ],
  },
];

const vettingOaktree = [
  {
    id: "identity",
    label: "Identity & location",
    items: [
      {
        id: "local-address",
        label: "Local business address",
        status: "verified",
        detail:
          "Trading address matches advertised service area and utility records on file.",
        facts: [
          { label: "Town / city", value: "Oxford" },
          {
            label: "Primary service area",
            value: "OX postcodes and advertised coverage",
          },
          {
            label: "On file",
            value:
              "Full street address verified with supporting evidence (not published on this page)",
          },
        ],
      },
      {
        id: "contact",
        label: "Contact number",
        status: "verified",
        detail: "Phone number verified as genuine and active.",
        value: "01865 000000",
        facts: [
          { label: "Line type", value: "UK number — routing and activity checked" },
          {
            label: "Matches",
            value: "Website, Google Business Profile, and materials on file",
          },
        ],
      },
      {
        id: "registration",
        label: "Business registration",
        status: "verified",
        detail: "Business identity and trading style cross-checked on public records.",
        facts: [
          { label: "Entity", value: "Trading style and public records reviewed" },
          { label: "Cross-check", value: "Name and contact routes consistent with marketing" },
        ],
      },
    ],
  },
  {
    id: "insurance",
    label: "Insurance & accreditations",
    items: [
      {
        id: "pl",
        label: "Public liability insurance",
        status: "verified",
        detail:
          "Liability cover confirmed with documentation held on file.",
        facts: [
          { label: "Cover type", value: "Public liability — schedule on file" },
          { label: "Check method", value: "Insurer / broker confirmation" },
        ],
      },
      {
        id: "trade-accred",
        label: "Trade accreditations",
        status: "verified",
        detail:
          "Gas Safe registration verified against the official Gas Safe Register.",
        facts: [
          { label: "Register", value: "Gas Safe Register — engineer and business details matched" },
          { label: "Scope", value: "Aligned with advertised heating / gas work" },
        ],
      },
    ],
  },
  {
    id: "digital",
    label: "Digital footprint",
    items: [
      {
        id: "website",
        label: "Website",
        status: "verified",
        detail: "Website and advertised services reviewed for consistency.",
        facts: [
          { label: "Site", value: "https://oaktree-plumbing.example.co.uk" },
          { label: "Checks", value: "HTTPS, contact details, and services match our file" },
        ],
      },
      {
        id: "gbp",
        label: "Google Business Profile",
        status: "verified",
        detail: "Listing aligns with confirmed locality and contact details.",
        facts: [
          { label: "Listing name", value: "Oaktree Plumbing & Heating" },
          { label: "Maps area", value: "Oxford, England" },
          { label: "Parity", value: "Phone and category consistent with verification" },
        ],
      },
      {
        id: "social",
        label: "Social media",
        status: "verified",
        detail: "Public social presence checked against trading identity.",
        facts: [
          { label: "Facebook", value: "@OaktreePlumbingOxford" },
          { label: "Instagram", value: "@oaktree_plumbing" },
          { label: "Note", value: "Profiles matched to business name and Oxford locality" },
        ],
      },
      {
        id: "reviews",
        label: "Online reviews",
        status: "verified",
        detail: "Review patterns assessed for authenticity signals.",
        facts: [
          { label: "Google reviews", value: "Sampled recent history — local job mix" },
          { label: "Other platforms", value: "Trade directories checked where linked from site" },
          {
            label: "Important",
            value:
              "We do not publish star ratings. We look for authenticity signals, not workmanship quality.",
          },
        ],
      },
    ],
  },
];

const vettingSummit = [
  {
    id: "identity",
    label: "Identity & location",
    items: [
      {
        id: "local-address",
        label: "Local business address",
        status: "verified",
        detail:
          "Local trading address confirmed against records and advertised coverage.",
        facts: [
          { label: "Town / city", value: "Sheffield" },
          {
            label: "Primary service area",
            value: "S postcodes and advertised South Yorkshire coverage",
          },
          {
            label: "On file",
            value:
              "Full street address verified with supporting evidence (not published on this page)",
          },
        ],
      },
      {
        id: "contact",
        label: "Contact number",
        status: "verified",
        detail: "Phone number verified as genuine and active.",
        value: "0114 0000000",
        facts: [
          { label: "Line type", value: "UK number — routing and activity checked" },
          {
            label: "Matches",
            value: "Website, Google Business Profile, and materials on file",
          },
        ],
      },
      {
        id: "registration",
        label: "Business registration",
        status: "verified",
        detail:
          "Companies House records reviewed; active UK entity consistent with marketing.",
        facts: [
          { label: "Entity", value: "Companies House — active UK entity on record" },
          { label: "Cross-check", value: "Trading identity consistent with advertising" },
        ],
      },
    ],
  },
  {
    id: "insurance",
    label: "Insurance & accreditations",
    items: [
      {
        id: "pl",
        label: "Public liability insurance",
        status: "verified",
        detail:
          "Public liability documentation reviewed with the insurer or broker on file.",
        facts: [
          { label: "Cover type", value: "Public liability — schedule on file" },
          { label: "Check method", value: "Insurer / broker confirmation" },
        ],
      },
      {
        id: "trade-accred",
        label: "Trade accreditations",
        status: "verified",
        detail:
          "Trade body and competency claims checked against available public registers where applicable.",
        facts: [
          { label: "Registers", value: "Competency / trade claims matched where publicly verifiable" },
          { label: "Scope", value: "Aligned with advertised roofing services" },
        ],
      },
    ],
  },
  {
    id: "digital",
    label: "Digital footprint",
    items: [
      {
        id: "website",
        label: "Website",
        status: "verified",
        detail:
          "Website content and contact routes match verified business details.",
        facts: [
          { label: "Site", value: "https://summit-roofing.example.co.uk" },
          { label: "Checks", value: "HTTPS, gallery, and contact parity with our file" },
        ],
      },
      {
        id: "gbp",
        label: "Google Business Profile",
        status: "verified",
        detail: "Profile location and category align with our confirmations.",
        facts: [
          { label: "Listing name", value: "Summit Roofing Services" },
          { label: "Maps area", value: "Sheffield, England" },
          { label: "Parity", value: "Phone and category consistent with verification" },
        ],
      },
      {
        id: "social",
        label: "Social media",
        status: "verified",
        detail: "Social presence sampled for alignment with the business name and area.",
        facts: [
          { label: "Facebook", value: "@SummitRoofingSheffield" },
          { label: "Instagram", value: "@summit_roofing" },
          { label: "Note", value: "Profiles matched to business name and Sheffield locality" },
        ],
      },
      {
        id: "reviews",
        label: "Online reviews",
        status: "verified",
        detail:
          "Online review history reviewed alongside other digital signals.",
        facts: [
          { label: "Google reviews", value: "Sampled recent history — regional job references" },
          { label: "Other platforms", value: "Directories and trade listings checked where cited" },
          {
            label: "Important",
            value:
              "We do not publish star ratings. We look for authenticity signals, not workmanship quality.",
          },
        ],
      },
    ],
  },
];

async function main() {
  const email =
    process.env.STAFF_SEED_EMAIL?.trim().toLowerCase() ||
    "admin@tradeverify.local";
  const plain =
    process.env.STAFF_SEED_PASSWORD?.trim() || "ChangeThisPassword!";
  const name = process.env.STAFF_SEED_NAME?.trim() || "Administrator";

  const hash = await bcrypt.hash(plain, 12);
  await prisma.staff.upsert({
    where: { email },
    create: { email, password: hash, name },
    update: { password: hash, name },
  });
  console.log(
    `[seed] Staff upserted: ${email} (password from STAFF_SEED_PASSWORD in server/.env, or default)`
  );
  console.log(
    `[seed] server/.env ${fs.existsSync(serverEnvPath) ? "found" : "NOT FOUND"} at ${serverEnvPath}`
  );

  const members = [
    {
      slug: "riverside-electrical-2847",
      tvId: "TV-2847",
      name: "Riverside Electrical Ltd",
      trade: "Electrician",
      location: "Bristol",
      checks: [
        "Local address confirmed",
        "Insurance verified",
        "Digital footprint checked",
        "Public records reviewed",
      ],
      verifiedSince: "November 2024",
      blurb:
        "NICEIC-registered contractor. Public liability and employer's liability confirmed with the insurer on file.",
      vettingItems: vettingRiverside,
    },
    {
      slug: "oaktree-plumbing-1922",
      tvId: "TV-1922",
      name: "Oaktree Plumbing & Heating",
      trade: "Plumber",
      location: "Oxford",
      checks: [
        "Local address confirmed",
        "Insurance verified",
        "Digital footprint checked",
        "Gas Safe register matched",
      ],
      verifiedSince: "January 2025",
      blurb:
        "Gas Safe registration verified against the official register. Trading address matches advertised service area.",
      vettingItems: vettingOaktree,
    },
    {
      slug: "summit-roofing-4401",
      tvId: "TV-4401",
      name: "Summit Roofing Services",
      trade: "Roofer",
      location: "Sheffield",
      checks: [
        "Local address confirmed",
        "Insurance verified",
        "Digital footprint checked",
        "Public records reviewed",
      ],
      verifiedSince: "March 2025",
      blurb:
        "Companies House and liability insurance cross-checked. Website and review history consistent with active local work.",
      vettingItems: vettingSummit,
    },
  ];

  for (const m of members) {
    const { vettingItems, ...rest } = m;
    await prisma.member.upsert({
      where: { slug: m.slug },
      create: { ...rest, checks: m.checks, vettingItems },
      update: {
        tvId: m.tvId,
        name: m.name,
        trade: m.trade,
        location: m.location,
        checks: m.checks,
        vettingItems,
        verifiedSince: m.verifiedSince,
        blurb: m.blurb,
      },
    });
  }

  const demoMemberEmail =
    process.env.MEMBER_DEMO_EMAIL?.trim().toLowerCase() ||
    "member@riverside.demo";
  const demoMemberPassword =
    process.env.MEMBER_DEMO_PASSWORD?.trim() || "MemberDemo123!";
  const memberHash = await bcrypt.hash(demoMemberPassword, 12);
  await prisma.member.update({
    where: { slug: "riverside-electrical-2847" },
    data: {
      loginEmail: demoMemberEmail,
      passwordHash: memberHash,
    },
  });
  console.log(
    `[seed] Member portal demo login: ${demoMemberEmail} / ${demoMemberPassword}`
  );

  console.log(`[seed] ${members.length} members`);

  const guides = [
    {
      slug: "before-you-hire",
      title: "Before you hire: a practical checklist",
      excerpt:
        "Deposits, written quotes, and how to sanity-check a tradesperson before work starts.",
      readTime: "6 min read",
      body: [
        "Always get a written quote that breaks down labour, materials, and VAT. Verbal estimates are hard to enforce if something goes wrong.",
        "For larger jobs, agree staged payments tied to milestones — not large upfront cash with little work done.",
        "Cross-check the business address and landline with what they advertise. A TradeVerify check is designed to confirm locality and genuine contact details.",
        "Ask for insurance details and, where relevant, scheme registrations (Gas Safe, NICEIC, etc.) and verify them on the official registers.",
      ],
    },
    {
      slug: "spot-fake-reviews",
      title: "Red flags in online reviews",
      excerpt:
        "Patterns that suggest reviews might not reflect real customers — and what to trust instead.",
      readTime: "4 min read",
      body: [
        "Clusters of five-star reviews posted in a short window, or repetitive wording across accounts, can be a warning sign.",
        "Genuine local trades often have a mix of ratings and detailed comments about specific jobs.",
        "Treat reviews as one signal only. Combine them with insurance checks, written quotes, and independent verification where available.",
      ],
    },
    {
      slug: "deposits-and-payments",
      title: "Deposits, cash, and staying protected",
      excerpt:
        "Reasonable deposit levels and payment methods that leave you with a paper trail.",
      readTime: "5 min read",
      body: [
        "A modest deposit for materials is common; paying the full balance before substantial work is completed is not.",
        "Paying by bank transfer or card gives a record. Be cautious of pressure to pay only in untraceable cash for the whole job.",
        "Keep copies of agreements, invoices, and messages. They help if you need to dispute poor work or no-shows.",
      ],
    },
  ];

  for (const g of guides) {
    await prisma.guide.upsert({
      where: { slug: g.slug },
      create: { ...g, body: g.body },
      update: {
        title: g.title,
        excerpt: g.excerpt,
        readTime: g.readTime,
        body: g.body,
      },
    });
  }
  console.log(`[seed] ${guides.length} guides`);

  await prisma.organizationSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
  console.log("[seed] Organization settings row ready");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
