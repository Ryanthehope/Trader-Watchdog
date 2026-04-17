import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function guideToPublic(g: any) {
  let body = [];
  if (Array.isArray(g.body)) {
    body = g.body;
  } else if (typeof g.body === "string") {
    try {
      body = JSON.parse(g.body);
    } catch {
      body = [];
    }
  }
  return {
    slug: g.slug,
    title: g.title,
    excerpt: g.excerpt,
    readTime: g.readTime,
    body,
  };
}

export async function GET() {
  try {
    const guides = await prisma.guide.findMany({ orderBy: { title: "asc" } });
    return NextResponse.json({ guides: guides.map(guideToPublic) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load guides" }, { status: 500 });
  }
}
