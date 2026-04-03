import { webcrypto } from "node:crypto";
/**
 * otplib / @noble/hashes expect `globalThis.crypto.getRandomValues`.
 * Node 18 often does not expose full Web Crypto on `globalThis` (Node 19+ does).
 */
if (typeof globalThis.crypto?.getRandomValues !== "function") {
    Object.defineProperty(globalThis, "crypto", {
        value: webcrypto,
        enumerable: true,
        configurable: true,
        writable: true,
    });
}
