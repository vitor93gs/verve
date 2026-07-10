import { NextResponse } from "next/server";
import { authCookieName, createSessionToken } from "@/lib/auth";
import { ensureSeeded } from "@/lib/data";
import { getDb } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/passwords";

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const { password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
  }

  await ensureSeeded();
  const db = await getDb();
  const user = await db.collection("team").findOne({ email });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
