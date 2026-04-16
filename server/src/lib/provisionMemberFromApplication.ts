import { randomBytes, randomInt } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { hashPortalPassword } from "./portalCredentials.js";
import { addOneCalendarMonthEndUtc } from "./membershipPeriod.js";

type MemberDb = Pick<PrismaClient, "member">;

function slugify(company: string): string {
  const s = company
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s.length >= 2 ? s : "verified-trade";
}

function generateTempPassword(): string {
  const chars =
    "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@%^*";
  let out = "";
  const buf = randomBytes(20);
  for (let i = 0; i < 14; i++) {
    out += chars[buf[i]! % chars.length];
  }
  return out;
}

async function uniqueSlug(db: MemberDb, company: string): Promise<string> {
  const base = slugify(company);
  for (let i = 0; i < 40; i++) {
    const candidate =
      i === 0 ? base : `${base}-${randomInt(1000, 99999)}`.slice(0, 60);
    const clash = await db.member.findUnique({ where: { slug: candidate } });
    if (!clash) return candidate;
  }
  throw new Error("Could not allocate a unique profile slug");
}

async function uniqueTvId(db: MemberDb): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const candidate = `TW-${randomInt(1000, 9999)}`;
    const clash = await db.member.findUnique({ where: { tvId: candidate } });
    if (!clash) return candidate;
  }
  throw new Error("Could not allocate a unique TradeVerify ID");
}

export type ProvisionResult =
  | {
      kind: "created";
      temporaryPassword: string;
      member: { id: string; slug: string; tvId: string };
    }
  | {
      kind: "already_linked";
      member: { id: string; slug: string; tvId: string };
    }
  | { kind: "not_approved" }
  | { kind: "email_in_use"; email: string };

export async function tryProvisionMemberForApplication(
  prisma: PrismaClient,
  applicationId: string
): Promise<ProvisionResult> {
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.findUnique({ where: { id: applicationId } });
    if (!app) {
      throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
    }
    if (app.createdMemberId) {
      const m = await tx.member.findUnique({
        where: { id: app.createdMemberId },
        select: { id: true, slug: true, tvId: true },
      });
      if (!m) {
        await tx.application.update({
          where: { id: app.id },
          data: { createdMemberId: null },
        });
      } else {
        return { kind: "already_linked", member: m };
      }
    }
    if (app.status !== "APPROVED") {
      return { kind: "not_approved" };
    }
    const email = app.email.trim().toLowerCase();
    const taken = await tx.member.findFirst({
      where: { loginEmail: email },
      select: { id: true },
    });
    if (taken) {
      return { kind: "email_in_use", email };
    }
    const slug = await uniqueSlug(tx, app.company);
    const tvId = await uniqueTvId(tx);
    const temporaryPassword = generateTempPassword();
    const now = new Date();
    const monthYear = now.toLocaleString("en-GB", {
      month: "long",
      year: "numeric",
    });
    const checks = [
      "TradeVerify staff review completed for this application.",
      `Approved ${monthYear}. Operating area and business identity confirmed.`,
      "Insurance and claimed credentials reviewed against supplied evidence.",
      "Public-facing details checked for consistency before listing.",
    ];
    const blurb = `${app.company} is a TradeVerify checked ${app.trade} business. This profile was published after staff vetting of the membership application.`;
    const membershipManual =
      Boolean(app.membershipSubscribed) && app.manualMembershipExpiresAt != null;
    const onlyFastTrack =
      Boolean(app.fastTrackPaidAt) && !app.membershipSubscribed;

    const membershipFromPayment =
      membershipManual
        ? {
            membershipBillingType: "manual" as const,
            membershipExpiresAt: app.manualMembershipExpiresAt!,
          }
        : onlyFastTrack && app.fastTrackPaidAt
          ? {
              membershipBillingType: "fast_track" as const,
              membershipExpiresAt: addOneCalendarMonthEndUtc(app.fastTrackPaidAt),
            }
        : {};

    const member = await tx.member.create({
      data: {
        slug,
        tvId,
        name: app.company.trim(),
        trade: app.trade.trim(),
        location: `${app.postcode.trim()} area`,
        checks,
        verifiedSince: monthYear,
        blurb,
        loginEmail: email,
        passwordHash: await hashPortalPassword(temporaryPassword),
        mustChangePassword: true,
        membershipUnlimited: false,
        stripeCustomerId: app.stripeCustomerId ?? undefined,
        ...membershipFromPayment,
      },
    });
    const inviteExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await tx.application.update({
      where: { id: app.id },
      data: {
        createdMemberId: member.id,
        pendingPortalPassword: temporaryPassword,
        pendingPortalPasswordExpires: inviteExpires,
      },
    });
    return {
      kind: "created",
      temporaryPassword,
      member: { id: member.id, slug: member.slug, tvId: member.tvId },
    };
  });
}
