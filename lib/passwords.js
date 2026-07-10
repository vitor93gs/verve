import crypto from "crypto";

const hashIterations = 120000;
const hashKeyLength = 32;
const hashDigest = "sha256";

export function defaultInitialPassword() {
  return process.env.APP_LOGIN_PASSWORD || process.env.MONGODB_PASSWORD || "verve123";
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, hashIterations, hashKeyLength, hashDigest).toString("hex");
  return `pbkdf2:${hashIterations}:${salt}:${hash}`;
}

export function verifyPassword(password = "", storedHash = "") {
  const [, iterations, salt, expectedHash] = storedHash.split(":");

  if (!iterations || !salt || !expectedHash) {
    return false;
  }

  const hash = crypto.pbkdf2Sync(password, salt, Number(iterations), hashKeyLength, hashDigest).toString("hex");
  return safeEqual(hash, expectedHash);
}

function safeEqual(value = "", expected = "") {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}
