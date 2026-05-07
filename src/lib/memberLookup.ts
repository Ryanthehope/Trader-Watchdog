import type { VerifiedMember } from "../types/content";

function phoneDigits(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/\D+/g, "");
}

export function findMemberInDirectory(
  members: VerifiedMember[],
  raw: string
): VerifiedMember | undefined {
  const q = raw.trim();
  if (!q) return undefined;
  const qLower = q.toLowerCase();
  const qDigits = phoneDigits(q);

  return members.find((m) => {
    if (m.slug.toLowerCase() === qLower) return true;
    if (m.name.toLowerCase().includes(qLower)) return true;
    const memberPhoneDigits = phoneDigits(m.phone);
    if (qDigits.length >= 6 && memberPhoneDigits.includes(qDigits)) return true;
    return false;
  });
}
