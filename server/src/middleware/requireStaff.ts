import type { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";

function jwtSecret(): string {
  const s = process.env.JWT_SECRET?.trim();
  if (!s) {
    console.warn(
      "[tradeverify] JWT_SECRET is not set; using insecure development default"
    );
    return "tradeverify-dev-insecure-secret";
  }
  return s;
}

export const requireStaff: RequestHandler = (req, res, next) => {
  const h = req.headers.authorization;
  const token = h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, jwtSecret()) as jwt.JwtPayload & {
      role?: string;
    };
    const id = payload.sub;
    if (!id || typeof id !== "string") {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    if (payload.role === "member") {
      res.status(403).json({ error: "Member token cannot access staff routes" });
      return;
    }
    (req as Request & { staffId: string }).staffId = id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
