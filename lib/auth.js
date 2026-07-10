import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/data";
import { getDb } from "@/lib/mongodb";

export const authCookieName = "verve_session";

export function createSessionToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function getSession() {
  const token = cookies().get(authCookieName)?.value;
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !safeEqual(signature, sign(encodedPayload))) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getSession());
}

export async function getCurrentUser() {
  const session = getSession();
  if (!session?.id) return null;

  await ensureSeeded();
  const db = await getDb();
  return db.collection("team").findOne(
    { id: session.id },
    { projection: { _id: 0, passwordHash: 0 } }
  );
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}

function sign(value) {
  const secret = process.env.AUTH_SECRET || process.env.MONGODB_URI || "verve-local-auth";
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function safeEqual(value = "", expected = "") {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}
