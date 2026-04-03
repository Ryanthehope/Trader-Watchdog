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

export type VettingCategoryPublic = {
  id: string;
  label: string;
  items: VettingItemPublic[];
};

export type VerifiedMember = {
  slug: string;
  tvId: string;
  name: string;
  trade: string;
  location: string;
  checks: string[];
  vettingCategories: VettingCategoryPublic[];
  verifiedSince: string;
  blurb: string;
  /** Public profile includes a logo image. */
  profileLogo?: boolean;
};

export type Guide = {
  slug: string;
  title: string;
  excerpt: string;
  readTime: string;
  body: string[];
};
