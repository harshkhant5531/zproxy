const express = require("express");
const jwt = require("jsonwebtoken");
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const prisma = require("../prisma");

const router = express.Router();

const getWebAuthnSecret = () =>
  process.env.WEBAUTHN_STATE_SECRET || process.env.JWT_SECRET;

const getRpId = () => {
  const explicit = String(process.env.WEBAUTHN_RP_ID || "").trim();
  if (explicit) return explicit;

  const frontendUrl = String(process.env.FRONTEND_URL || "").trim();
  if (frontendUrl) {
    try {
      return new URL(frontendUrl).hostname;
    } catch {
      // fall through
    }
  }
  return "localhost";
};

const getExpectedOrigins = () => {
  const envOrigins = String(process.env.WEBAUTHN_ORIGIN || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (envOrigins.length > 0) return envOrigins;

  const frontendUrl = String(process.env.FRONTEND_URL || "").trim();
  if (frontendUrl) return [frontendUrl];
  return ["http://localhost:8080"];
};

const buildStateToken = (payload, expiresIn = "5m") => {
  const secret = getWebAuthnSecret();
  if (!secret) throw new Error("WEBAUTHN_STATE_SECRET or JWT_SECRET is required");
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyStateToken = (token, expectedPurpose) => {
  const secret = getWebAuthnSecret();
  if (!secret || !token) return null;
  try {
    const decoded = jwt.verify(token, secret);
    if (decoded?.purpose !== expectedPurpose) return null;
    return decoded;
  } catch {
    return null;
  }
};

const buildAttendanceAssertionToken = ({ userId, sessionId }) => {
  const secret = getWebAuthnSecret();
  if (!secret) throw new Error("WEBAUTHN_STATE_SECRET or JWT_SECRET is required");
  return jwt.sign(
    {
      purpose: "attendance-webauthn-assertion",
      userId,
      sessionId,
      uv: true,
    },
    secret,
    { expiresIn: "2m" },
  );
};

const isAuthenticatorRequired = () =>
  String(process.env.ATTENDANCE_AUTHENTICATOR_MODE || "required").toLowerCase() !==
  "off";

const getUserDisplayName = (user) =>
  user?.studentProfile?.fullName ||
  user?.facultyProfile?.fullName ||
  user?.adminProfile?.fullName ||
  user?.username ||
  `user_${user?.id}`;

router.get("/status", async (req, res, next) => {
  try {
    const count = await prisma.webAuthnCredential.count({
      where: { userId: req.user.id },
    });
    res.json({
      success: true,
      data: {
        enrolled: count > 0,
        credentialCount: count,
        rpId: getRpId(),
        requiredForAttendance: isAuthenticatorRequired(),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/register/options", async (req, res, next) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      include: {
        studentProfile: true,
        facultyProfile: true,
        adminProfile: true,
      },
    });
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const existingCredentials = await prisma.webAuthnCredential.findMany({
      where: { userId: req.user.id },
      select: { credentialId: true, transports: true },
    });

    const options = await generateRegistrationOptions({
      rpID: getRpId(),
      rpName: process.env.WEBAUTHN_RP_NAME || "Aura Integrity",
      userID: String(user.id),
      userName: user.username,
      userDisplayName: getUserDisplayName(user),
      timeout: 60000,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.credentialId,
        transports: Array.isArray(cred.transports) ? cred.transports : [],
      })),
    });

    const stateToken = buildStateToken({
      purpose: "webauthn-register",
      userId: req.user.id,
      challenge: options.challenge,
    });

    res.json({
      success: true,
      data: {
        options,
        stateToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/register/verify", async (req, res, next) => {
  try {
    const { response, stateToken } = req.body || {};
    const state = verifyStateToken(stateToken, "webauthn-register");
    if (!state || Number(state.userId) !== Number(req.user.id)) {
      const error = new Error("Registration state is invalid or expired");
      error.statusCode = 400;
      throw error;
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: state.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      const error = new Error("Passkey registration could not be verified");
      error.statusCode = 400;
      throw error;
    }

    const credential = verification.registrationInfo.credential;
    await prisma.webAuthnCredential.upsert({
      where: { credentialId: credential.id },
      update: {
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        deviceType: verification.registrationInfo.credentialDeviceType || null,
        backedUp: Boolean(verification.registrationInfo.credentialBackedUp),
        transports: Array.isArray(credential.transports)
          ? credential.transports
          : [],
        lastUsedAt: new Date(),
      },
      create: {
        userId: req.user.id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        deviceType: verification.registrationInfo.credentialDeviceType || null,
        backedUp: Boolean(verification.registrationInfo.credentialBackedUp),
        transports: Array.isArray(credential.transports)
          ? credential.transports
          : [],
        lastUsedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: { verified: true },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/authenticate/options", async (req, res, next) => {
  try {
    const { sessionId } = req.body || {};
    const parsedSessionId = Number.parseInt(String(sessionId), 10);
    if (!Number.isFinite(parsedSessionId)) {
      const error = new Error("Session ID is required");
      error.statusCode = 400;
      throw error;
    }

    if (req.user.role === "student") {
      const isEnrolled = await prisma.course.findFirst({
        where: {
          sessions: { some: { id: parsedSessionId } },
          students: { some: { id: req.user.id } },
        },
        select: { id: true },
      });
      if (!isEnrolled) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
      }
    }

    const credentials = await prisma.webAuthnCredential.findMany({
      where: { userId: req.user.id },
      select: { credentialId: true, transports: true },
    });
    if (credentials.length === 0) {
      const error = new Error("No passkey enrolled for this account");
      error.statusCode = 400;
      error.reasonCode = "webauthn_not_enrolled";
      throw error;
    }

    const options = await generateAuthenticationOptions({
      rpID: getRpId(),
      timeout: 60000,
      allowCredentials: credentials.map((cred) => ({
        id: cred.credentialId,
        transports: Array.isArray(cred.transports) ? cred.transports : [],
      })),
      userVerification: "required",
    });

    const stateToken = buildStateToken({
      purpose: "webauthn-authenticate",
      userId: req.user.id,
      challenge: options.challenge,
      sessionId: parsedSessionId,
    });

    res.json({
      success: true,
      data: {
        options,
        stateToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/authenticate/verify", async (req, res, next) => {
  try {
    const { response, stateToken } = req.body || {};
    const state = verifyStateToken(stateToken, "webauthn-authenticate");
    if (!state || Number(state.userId) !== Number(req.user.id)) {
      const error = new Error("Authentication state is invalid or expired");
      error.statusCode = 400;
      throw error;
    }

    const credentialId = response?.id;
    if (!credentialId) {
      const error = new Error("Credential ID is required");
      error.statusCode = 400;
      throw error;
    }

    const stored = await prisma.webAuthnCredential.findUnique({
      where: { credentialId },
    });
    if (!stored || stored.userId !== req.user.id) {
      const error = new Error("Unknown authenticator");
      error.statusCode = 404;
      throw error;
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: state.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
      credential: {
        id: stored.credentialId,
        publicKey: Buffer.from(stored.publicKey, "base64url"),
        counter: stored.counter,
        transports: Array.isArray(stored.transports) ? stored.transports : [],
      },
    });

    if (!verification.verified || !verification.authenticationInfo) {
      const error = new Error("Passkey authentication failed");
      error.statusCode = 403;
      throw error;
    }

    await prisma.webAuthnCredential.update({
      where: { credentialId: stored.credentialId },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    const attendanceAssertionToken = buildAttendanceAssertionToken({
      userId: req.user.id,
      sessionId: Number(state.sessionId),
    });

    res.json({
      success: true,
      data: {
        verified: true,
        attendanceAssertionToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
