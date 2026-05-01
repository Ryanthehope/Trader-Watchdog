import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
const router = Router();
function normalizeEmail(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}
function normalizePassword(value) {
    return String(value ?? "")
        .replace(/[\r\n]+/g, "")
        .trim();
}
function jwtSecret() {
    const s = process.env.JWT_SECRET?.trim();
    if (!s)
        return "tradeverify-dev-insecure-secret";
    return s;
}
router.post("/login", async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const password = normalizePassword(req.body?.password);
        if (!email || !password) {
            res.status(400).json({ error: "Email and password are required" });
            return;
        }
        const member = await prisma.member.findFirst({
            where: { loginEmail: email },
        });
        if (!member?.passwordHash) {
            res.status(401).json({
                error: "Invalid email or password. Ask TradeVerify if your portal access is set up.",
            });
            return;
        }
        const ok = await bcrypt.compare(password, member.passwordHash);
        if (!ok) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }
        await prisma.application.updateMany({
            where: { createdMemberId: member.id },
            data: {
                pendingPortalPassword: null,
                pendingPortalPasswordExpires: null,
            },
        });
        const token = jwt.sign({ sub: member.id, role: "member", email: member.loginEmail }, jwtSecret(), { expiresIn: "14d" });
        res.json({
            token,
            mustChangePassword: member.mustChangePassword,
            member: {
                id: member.id,
                name: member.name,
                tvId: member.tvId,
                slug: member.slug,
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Login failed" });
    }
});
export default router;
