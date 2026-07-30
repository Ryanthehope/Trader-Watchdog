
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { requireStaff } from "./requireStaff.js";

describe("requireStaff", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-that-is-definitely-long-enough";
  });

  function createApp() {
    const app = express();
    app.get("/protected", requireStaff, (_req, res) => {
      res.status(204).send();
    });
    return app;
  }

  it("allows a completed staff session", async () => {
    const token = jwt.sign(
      { sub: "staff-1", role: "staff" },
      process.env.JWT_SECRET!
    );

    await request(createApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });

  it("rejects a 2FA-pending token", async () => {
    const token = jwt.sign(
      { sub: "staff-1", k: "2fa" },
      process.env.JWT_SECRET!
    );

    await request(createApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("rejects a token without an explicit staff role", async () => {
    const token = jwt.sign(
      { sub: "staff-1" },
      process.env.JWT_SECRET!
    );

    await request(createApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("rejects a member token", async () => {
    const token = jwt.sign(
      { sub: "member-1", role: "member" },
      process.env.JWT_SECRET!
    );

    await request(createApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });
});