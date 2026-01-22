import cors from "cors";
import crypto from "crypto";
import express from "express";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const startedAt = Date.now();
  const requestId = `${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
  const requestCookies = req.headers.cookie || null;

  console.log(`[${requestId}] --> ${req.method} ${req.originalUrl}`);
  console.log(`[${requestId}] request`, {
    query: req.query,
    params: req.params,
    body: req.body,
    cookies: requestCookies,
  });

  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  let responseBody;

  res.json = (payload) => {
    responseBody = payload;
    return originalJson(payload);
  };
  res.send = (payload) => {
    responseBody = payload;
    return originalSend(payload);
  };

  res.on("finish", () => {
    const responseCookies = res.getHeader("set-cookie") || null;
    const durationMs = Date.now() - startedAt;
    console.log(`[${requestId}] <-- ${res.statusCode} ${req.method} ${req.originalUrl} (${durationMs}ms)`);
    console.log(`[${requestId}] response`, {
      body: responseBody,
      cookies: responseCookies,
    });
  });

  next();
});

const serviceURL = process.env.SERVICE_URL || `http://localhost:${port}`;
const rpId = process.env.PASSKEY_RP_ID || "localhost";
const rpName = process.env.PASSKEY_RP_NAME || "Passkey Demo";

const defaultOrigins = ["http://localhost:19006", "http://localhost:8081"];
const passkeyOrigins = process.env.PASSKEY_ORIGINS
  ? process.env.PASSKEY_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [...defaultOrigins, "passkey-demo://", "exp://"];

const passkeysByUser = new Map();
const passkeysByCredential = new Map();
const registrationChallenges = new Map();
const authChallenges = new Map();
const challengeTtlMs = 5 * 60 * 1000;

const getUserIdFromRequest = (req) => {
  const headerUserId = req.headers["x-user-id"];
  const userId =
    headerUserId ||
    req.body?.userId ||
    req.query?.userId ||
    req.params?.userId;
  if (typeof userId !== "string") {
    return null;
  }
  const trimmed = userId.trim();
  return trimmed.length ? trimmed : null;
};

const getUserPasskeys = (userId) => passkeysByUser.get(userId) || [];
const findPasskeyByCredential = (credentialId) =>
  passkeysByCredential.get(credentialId) || null;

app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: ["set-cookie"],
  })
);

const generateOperationId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString("hex");

app.post("/api/passkey/expo-passkey/challenge", async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { type, registrationOptions } = req.body || {};
    if (!type) {
      return res.status(400).json({ error: "MISSING_TYPE" });
    }

    if (type === "registration") {
      if (!userId) {
        return res.status(400).json({ error: "MISSING_USER_ID" });
      }
      const existingPasskeys = getUserPasskeys(userId);
      const options = await generateRegistrationOptions({
        rpName,
        rpID: rpId,
        userName: userId,
        userID: Buffer.from(userId, "utf8"),
        userDisplayName: userId,
        attestationType: registrationOptions?.attestation || "none",
        authenticatorSelection: registrationOptions?.authenticatorSelection || {
          residentKey: "preferred",
          userVerification: "preferred",
        },
        timeout: registrationOptions?.timeout,
        excludeCredentials: existingPasskeys.map((passkey) => ({
          id: passkey.credentialId,
        })),
      });

      registrationChallenges.set(userId, {
        challenge: options.challenge,
        expiresAt: Date.now() + challengeTtlMs,
      });

      return res.json({ challenge: options.challenge });
    }

    const challengeUserId = userId || "auto-discovery";
    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: "required",
    });

    authChallenges.set(challengeUserId, {
      challenge: options.challenge,
      expiresAt: Date.now() + challengeTtlMs,
      createdAt: Date.now(),
    });

    return res.json({ challenge: options.challenge });
  } catch (error) {
    console.error("Failed to create challenge:", error);
    return res.status(500).json({ error: "CHALLENGE_FAILED" });
  }
});

app.post("/api/passkey/expo-passkey/register", async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(400).json({ error: "MISSING_USER_ID" });
    }

    const { credential, platform, metadata } = req.body || {};
    if (!credential) {
      return res.status(400).json({ error: "MISSING_CREDENTIAL" });
    }

    const storedChallenge = registrationChallenges.get(userId);
    if (!storedChallenge) {
      return res.status(400).json({ error: "CHALLENGE_NOT_FOUND" });
    }
    if (storedChallenge.expiresAt < Date.now()) {
      registrationChallenges.delete(userId);
      return res.status(400).json({ error: "CHALLENGE_EXPIRED" });
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: storedChallenge.challenge,
      expectedOrigin: passkeyOrigins,
      expectedRPID: rpId,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(401).json({ success: false });
    }

    const now = new Date().toISOString();
    const credentialId = verification.registrationInfo.credential.id;
    const passkey = {
      id: generateOperationId(),
      userId,
      credentialId,
      publicKey: isoBase64URL.fromBuffer(
        verification.registrationInfo.credential.publicKey
      ),
      counter: verification.registrationInfo.credential.counter,
      transports: verification.registrationInfo.credential.transports || [],
      aaguid: verification.registrationInfo.aaguid,
      platform: platform || "unknown",
      lastUsed: now,
      status: "active",
      createdAt: now,
      updatedAt: now,
      metadata: metadata || {},
    };

    const existing = findPasskeyByCredential(credentialId);
    if (existing) {
      existing.counter = passkey.counter;
      existing.updatedAt = now;
      existing.lastUsed = now;
      existing.metadata = passkey.metadata;
    } else {
      const userPasskeys = getUserPasskeys(userId);
      passkeysByUser.set(userId, [...userPasskeys, passkey]);
      passkeysByCredential.set(credentialId, passkey);
    }

    registrationChallenges.delete(userId);

    return res.json({ success: true, rpName, rpId });
  } catch (error) {
    console.error("Failed to register passkey:", error);
    return res.status(500).json({ error: "REGISTRATION_FAILED" });
  }
});

app.post("/api/passkey/expo-passkey/authenticate", async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential?.id) {
      return res.status(400).json({ error: "INVALID_CREDENTIAL" });
    }

    const passkey = findPasskeyByCredential(credential.id);

    if (!passkey) {
      return res.status(400).json({ error: "PASSKEY_NOT_FOUND" });
    }

    const candidateChallenges = [
      authChallenges.get(passkey.userId),
      authChallenges.get("auto-discovery"),
    ].filter(Boolean);
    const stored = candidateChallenges.sort(
      (a, b) => b.createdAt - a.createdAt
    )[0];

    if (!stored) {
      return res.status(400).json({ error: "CHALLENGE_NOT_FOUND" });
    }
    if (stored.expiresAt < Date.now()) {
      return res.status(400).json({ error: "CHALLENGE_EXPIRED" });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: stored.challenge,
      expectedOrigin: passkeyOrigins,
      expectedRPID: rpId,
      requireUserVerification: true,
      credential: {
        id: passkey.credentialId,
        publicKey: isoBase64URL.toBuffer(passkey.publicKey),
        counter: passkey.counter,
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ error: "INVALID_CREDENTIAL" });
    }

    const now = new Date().toISOString();
    passkey.counter = verification.authenticationInfo.newCounter;
    passkey.updatedAt = now;
    passkey.lastUsed = now;

    authChallenges.delete(passkey.userId);
    authChallenges.delete("auto-discovery");

    return res.json({
      token: `passkey-2fa-${passkey.credentialId}`,
      user: {
        id: passkey.userId,
        email: passkey.userId,
        emailVerified: true,
      },
    });
  } catch (error) {
    console.error("Failed to authenticate passkey:", error);
    return res.status(500).json({ error: "AUTH_FAILED" });
  }
});


app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Passkey demo backend running on ${serviceURL}`);
});
