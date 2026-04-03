import type { VerifiedMember } from "../types/content";

function stripTvPrefix(s: string): string {
  let t = s.trim().toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
  if (t.startsWith("tv")) t = t.slice(2);
  return t;
}

export function findMemberInDirectory(
  members: VerifiedMember[],
  raw: string
): VerifiedMember | undefined {
  const q = raw.trim();
  if (!q) return undefined;
  const compact = stripTvPrefix(q);
  const qLower = q.toLowerCase();

  return members.find((m) => {
    if (m.slug.toLowerCase() === qLower) return true;
    const idDigits = stripTvPrefix(m.tvId);
    if (compact && idDigits === compact) return true;
    if (m.name.toLowerCase().includes(qLower)) return true;
    return false;
  });
}
