import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const authCookieName = "verve_session";

export function getLoginCredentials() {
  return {
    username: process.env.APP_LOGIN_USERNAME || process.env.MONGODB_USERNAME || "verve",
    password: process.env.APP_LOGIN_PASSWORD || process.env.MONGODB_PASSWORD || ""
  };
}

export function createSessionToken() {
  const { username, password } = getLoginCredentials();
  const secret = process.env.AUTH_SECRET || process.env.MONGODB_URI || "verve-local-auth";
  return crypto.createHash("sha256").update(`${username}:${password}:${secret}`).digest("hex");
}

export function isValidLogin(username, password) {
  const credentials = getLoginCredentials();
  return safeEqual(username, credentials.username) && safeEqual(password, credentials.password);
}

export function isAuthenticated() {
  return cookies().get(authCookieName)?.value === createSessionToken();
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function safeEqual(value = "", expected = "") {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}
