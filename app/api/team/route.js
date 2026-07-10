import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/auth";
import { ensureSeeded } from "@/lib/data";
import { getDb } from "@/lib/mongodb";
import { hashPassword } from "@/lib/passwords";

const roles = ["member", "admin"];

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const name = body.name?.trim();
    const area = body.area?.trim();
    const email = body.email?.trim().toLowerCase();
    const role = roles.includes(body.role) ? body.role : "member";
    const password = body.password?.trim();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
    }

    await ensureSeeded();
    const db = await getDb();
    const existing = await db.collection("team").findOne({ email }, { projection: { _id: 0, id: 1 } });

    if (existing) {
      return NextResponse.json({ error: "Já existe um membro com este e-mail." }, { status: 409 });
    }

    const member = {
      id: `t${Date.now()}`,
      name,
      area: area || "",
      email,
      role,
      passwordHash: hashPassword(password),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("team").insertOne(member);

    const { passwordHash, _id, ...safeMember } = member;
    return NextResponse.json(safeMember, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
