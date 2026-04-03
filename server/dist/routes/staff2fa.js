import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { prisma } from "../db.js";
function prisma2faSetupError(e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2022") {
            return {
                status: 503,
                error: "Database is missing 2FA columns on Staff (totpSecret, totpEnabled). On the server run: npx prisma db push — or apply migrations — then restart.",
            };
        }
        if (e.code === "P2021") {
            return {
                status: 503,
                error: "Database table missing (Prisma P2021). Run npx prisma db push on the server and restart Node.",
            };
        }
        if (e.code === "P2025") {
            return { status: 404, error: "Staff account not found." };
        }
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (/no such column|unknown column|does not exist|SQLITE_ERROR/i.test(msg)) {
        return {
            status: 503,
            error: "Database schema looks out of date (2FA fields missing). On the server: cd to the server app folder, run npx prisma db push, then restart Node.",
        };
    }
    return null;
}
export function registerStaff2faRoutes(router) {
    router.post("/me/2fa/setup", async (req, res) => {
        try {
            const staffId = req.staffId;
            const staff = await prisma.staff.findUnique({ where: { id: staffId } });
            if (!staff) {
                res.status(404).json({ error: "Not found" });
                return;
            }
            const secret = generateSecret();
            await prisma.staff.update({
                where: { id: staffId },
                data: { totpSecret: secret, totpEnabled: false },
            });
            const otpauthUrl = generateURI({
                issuer: "TradeVerify Staff",
                label: staff.email,
                secret,
            });
            let qrDataUrl = "";
            try {
                qrDataUrl = await QRCode.toDataURL(otpauthUrl);
            }
            catch (qrErr) {
                console.error("[2fa] QRCode.toDataURL failed", qrErr);
            }
            res.json({ otpauthUrl, qrDataUrl });
        }
        catch (e) {
            console.error("[2fa] setup failed", e);
            const mapped = prisma2faSetupError(e);
            if (mapped) {
                res.status(mapped.status).json({ error: mapped.error });
                return;
            }
            res.status(500).json({ error: "Could not start 2FA setup" });
        }
    });
    router.post("/me/2fa/confirm", async (req, res) => {
        try {
            const staffId = req.staffId;
            const code = String(req.body?.code ?? "").replace(/\s/g, "");
            if (!code) {
                res.status(400).json({ error: "code is required" });
                return;
            }
            const staff = await prisma.staff.findUnique({ where: { id: staffId } });
            if (!staff?.totpSecret) {
                res.status(400).json({ error: "Run setup first" });
                return;
            }
            const { valid } = verifySync({
                token: code,
                secret: staff.totpSecret,
            });
            if (!valid) {
                res.status(401).json({ error: "Invalid code" });
                return;
            }
            await prisma.staff.update({
                where: { id: staffId },
                data: { totpEnabled: true },
            });
            res.json({ ok: true });
        }
        catch (e) {
            console.error(e);
            res.status(500).json({ error: "Could not enable 2FA" });
        }
    });
    router.post("/me/2fa/disable", async (req, res) => {
        try {
            const staffId = req.staffId;
            const password = String(req.body?.password ?? "");
            if (!password) {
                res.status(400).json({ error: "password is required" });
                return;
            }
            const staff = await prisma.staff.findUnique({ where: { id: staffId } });
            if (!staff) {
                res.status(404).json({ error: "Not found" });
                return;
            }
            const ok = await bcrypt.compare(password, staff.password);
            if (!ok) {
                res.status(401).json({ error: "Incorrect password" });
                return;
            }
            await prisma.staff.update({
                where: { id: staffId },
                data: { totpSecret: null, totpEnabled: false },
            });
            res.json({ ok: true });
        }
        catch (e) {
            console.error(e);
            res.status(500).json({ error: "Could not disable 2FA" });
        }
    });
}
