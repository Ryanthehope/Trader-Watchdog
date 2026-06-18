import { Router } from "express";
import { prisma } from "../db.js";
import { publicSiteBase } from "../lib/adminMail.js";
import { isMemberPublicListingVisible } from "../lib/memberMembership.js";

const router = Router();

const STATIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/join", changefreq: "monthly", priority: "0.8" },
  { path: "/guides", changefreq: "weekly", priority: "0.7" },
  { path: "/verify", changefreq: "monthly", priority: "0.7" },
  { path: "/verification-methodology", changefreq: "yearly", priority: "0.5" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/cookie-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/complaints-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/contact", changefreq: "yearly", priority: "0.4" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

router.get("/sitemap.xml", async (_req, res) => {
  try {
    const base = (await publicSiteBase(prisma)).replace(/\/$/, "");

    const [rawMembers, guides] = await Promise.all([
      prisma.member.findMany({
        select: {
          slug: true,
          updatedAt: true,
          membershipUnlimited: true,
          membershipBillingType: true,
          membershipExpiresAt: true,
        },
      }),
      prisma.guide.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const visibleMembers = rawMembers.filter((m) => isMemberPublicListingVisible(m));

    const urlTags: string[] = [];

    for (const page of STATIC_PAGES) {
      urlTags.push(
        `  <url>\n    <loc>${escapeXml(base + page.path)}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`
      );
    }

    for (const m of visibleMembers) {
      const lastmod = m.updatedAt.toISOString().split("T")[0];
      urlTags.push(
        `  <url>\n    <loc>${escapeXml(`${base}/m/${m.slug}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
      );
    }

    for (const g of guides) {
      const lastmod = g.updatedAt.toISOString().split("T")[0];
      urlTags.push(
        `  <url>\n    <loc>${escapeXml(`${base}/guides/${g.slug}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.5</priority>\n  </url>`
      );
    }

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...urlTags,
      `</urlset>`,
    ].join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (e) {
    console.error("[sitemap] Error generating sitemap", e);
    res.status(500).type("text").send("Error generating sitemap");
  }
});

router.get("/robots.txt", async (_req, res) => {
  try {
    const base = (await publicSiteBase(prisma)).replace(/\/$/, "");
    const content = [
      "User-agent: *",
      "Allow: /",
      "",
      `Sitemap: ${base}/sitemap.xml`,
    ].join("\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(content);
  } catch (e) {
    console.error("[sitemap] Error generating robots.txt", e);
    res.status(500).type("text").send("Error generating robots.txt");
  }
});

export default router;
