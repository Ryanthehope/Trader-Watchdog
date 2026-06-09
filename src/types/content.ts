export type VettingItemStatus = "verified" | "pending";

export type VettingFactPublic = {
  label: string;
  value: string;
};

export type VettingItemPublic = {
  id: string;
  label: string;
  status: VettingItemStatus;
  detail?: string;
  value?: string;
  facts?: VettingFactPublic[];
};

export type VettingSectionPublic = {
  id: string;
  label: string;
  items: VettingItemPublic[];
};

export type InsuranceSummaryPublic = {
  type: string;
  status: "active" | "expiring_soon" | "in_grace";
};

export type VerifiedMember = {
  slug: string;
  tvId: string;
  name: string;
  trade: string;
  location: string;
  publicAddress: string | null;
  phone: string | null;
  checks: string[];
  vettingSections: VettingSectionPublic[];
  verifiedSince: string;
  blurb: string;
  /** Public profile includes a logo image. */
  profileLogo?: boolean;
  /** Active or expiring insurance policies \u2014 type and status only. */
  insurancePolicies?: InsuranceSummaryPublic[];
};

export type Guide = {
  slug: string;
  title: string;
  excerpt: string;
  readTime: string;
  body: string[];
};
