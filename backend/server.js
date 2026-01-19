const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const { isoBase64URL } = require("@simplewebauthn/server/helpers");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

const rpName = "Passkey Demo";
const rpID = "localhost";
const origin = "http://localhost:5173";

const users = new Map();
const pendingAuthChallenges = new Set();

function getOrCreateUser(username, displayName) {
  let user = users.get(username);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      userID: crypto.randomBytes(32),
      username,
      displayName: displayName || username,
      credentials: [],
      currentChallenge: null,
    };
    users.set(username, user);
  }
  return user;
}

function getUser(username) {
  return users.get(username);
}

function findCredential(user, credentialID) {
  return user.credentials.find((cred) => cred.credentialID === credentialID);
}

function normalizeCredentialID(credentialID) {
  if (!credentialID) {
    return "";
  }
  if (typeof credentialID === "string") {
    return isoBase64URL.trimPadding(credentialID);
  }
  return isoBase64URL.fromBuffer(credentialID);
}

function findUserByHandle(userHandle) {
  for (const user of users.values()) {
    if (isoBase64URL.fromBuffer(user.userID) === userHandle) {
      return user;
    }
  }
  return null;
}

function findUserByCredentialID(credentialID) {
  for (const user of users.values()) {
    const credential = findCredential(user, credentialID);
    if (credential) {
      return user;
    }
  }
  return null;
}

function listCredentialIDs() {
  const all = [];
  for (const user of users.values()) {
    for (const cred of user.credentials) {
      all.push({ username: user.username, credentialID: cred.credentialID });
    }
  }
  return all;
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/register/options", async (req, res) => {
  const { username, displayName } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: "username required" });
  }

  const user = getOrCreateUser(username, displayName);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: user.userID,
    userName: user.username,
    userDisplayName: user.displayName,
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "preferred",
    },
    excludeCredentials: user.credentials.map((cred) => ({
      id: cred.credentialID,
      transports: cred.transports,
      type: "public-key",
    })),
  });

  user.currentChallenge = options.challenge;

  res.json(options);
});

app.post("/register/verify", async (req, res) => {
  const { username, attestation } = req.body || {};
  const user = getUser(username);

  if (!user) {
    return res.status(400).json({ error: "unknown user" });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter } =
        verification.registrationInfo;

      const credentialIDBase64 = normalizeCredentialID(credentialID);
      if (!credentialIDBase64) {
        throw new Error("empty credential ID from registration");
      }
      const existing = findCredential(user, credentialIDBase64);
      if (!existing) {
        user.credentials.push({
          credentialID: credentialIDBase64,
          credentialPublicKey,
          counter,
          transports: attestation.transports || [],
        });
        console.log("registered credential", {
          username: user.username,
          credentialID: credentialIDBase64,
        });
      }
    }

    user.currentChallenge = null;

    res.json({ verified: verification.verified });
  } catch (error) {
    res.status(400).json({ error: error.message || "verification failed" });
  }
});

app.post("/auth/options", async (req, res) => {
  const { username } = req.body || {};
  let options;

  if (username) {
    const user = getUser(username);
    if (!user) {
      return res.status(400).json({ error: "unknown user" });
    }

    options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.credentials.map((cred) => ({
        id: cred.credentialID,
        type: "public-key",
        transports: cred.transports,
      })),
      userVerification: "preferred",
    });

    user.currentChallenge = options.challenge;
  } else {
    options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
    });

    pendingAuthChallenges.add(options.challenge);
  }

  res.json(options);
});

app.post("/auth/verify", async (req, res) => {
  const { username, assertion } = req.body || {};
  let user = null;

  if (username) {
    user = getUser(username);
  } else {
    const userHandle = assertion?.response?.userHandle;
    if (typeof userHandle === "string") {
      user = findUserByHandle(userHandle);
    }
    if (!user && typeof assertion?.rawId === "string") {
      user = findUserByCredentialID(assertion.rawId);
    }
  }

  if (!user) {
    console.log("auth failed: unknown user", {
      requestedUsername: username || null,
      assertionRawId: assertion?.rawId || null,
      assertionUserHandle: assertion?.response?.userHandle || null,
      knownCredentials: listCredentialIDs(),
    });
    return res.status(400).json({ error: "unknown user" });
  }

  try {
    const credentialID = normalizeCredentialID(assertion.rawId);
    const authenticator = findCredential(user, credentialID);

    if (!authenticator) {
      console.log("auth failed: unknown credential", {
        username: user.username,
        assertionRawId: assertion?.rawId || null,
        knownCredentials: user.credentials.map((cred) => cred.credentialID),
      });
      return res.status(400).json({ error: "unknown credential" });
    }

    const expectedChallenge = username
      ? user.currentChallenge
      : (challenge) => {
          const known = pendingAuthChallenges.has(challenge);
          if (known) {
            pendingAuthChallenges.delete(challenge);
          }
          return known;
        };

    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        ...authenticator,
        credentialID: isoBase64URL.toBuffer(authenticator.credentialID),
      },
      requireUserVerification: false,
    });

    if (verification.verified) {
      authenticator.counter = verification.authenticationInfo.newCounter;
    }

    user.currentChallenge = null;

    res.json({ verified: verification.verified });
  } catch (error) {
    res.status(400).json({ error: error.message || "verification failed" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Passkey demo backend running on http://localhost:${port}`);
});
