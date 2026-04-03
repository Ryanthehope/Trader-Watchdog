import jwt from "jsonwebtoken";
function jwtSecret() {
    const s = process.env.JWT_SECRET?.trim();
    if (!s)
        return "tradeverify-dev-insecure-secret";
    return s;
}
export const requireMember = (req, res, next) => {
    const h = req.headers.authorization;
    const token = h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const payload = jwt.verify(token, jwtSecret());
        if (payload.role !== "member" || !payload.sub || typeof payload.sub !== "string") {
            res.status(403).json({ error: "Invalid member session" });
            return;
        }
        req.memberId = payload.sub;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
};
