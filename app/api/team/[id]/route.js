import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/auth";
import { ensureSeeded } from "@/lib/data";
import { getDb } from "@/lib/mongodb";
import { hashPassword } from "@/lib/passwords";

const roles = ["member", "admin"];

export async function PATCH(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const update = {};

    if (body.name !== undefined) update.name = body.name.trim();
    if (body.area !== undefined) update.area = body.area.trim();
    if (body.email !== undefined) update.email = body.email.trim().toLowerCase();
    if (body.role !== undefined && roles.includes(body.role)) update.role = body.role;
    if (body.password?.trim()) update.passwordHash = hashPassword(body.password.trim());

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nenhum campo válido para atualizar." }, { status: 400 });
    }

    if (update.name === "" || update.email === "") {
      return NextResponse.json({ error: "Nome e e-mail não podem ficar vazios." }, { status: 400 });
    }

    update.updatedAt = new Date();

    await ensureSeeded();
    const db = await getDb();
    const result = await db.collection("team").findOneAndUpdate(
      { id: params.id },
      { $set: update },
      { projection: { _id: 0, passwordHash: 0 }, returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Já existe um membro com este e-mail." }, { status: 409 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized();
  }

  if (admin.id === params.id) {
    return NextResponse.json({ error: "Você não pode remover o próprio usuário." }, { status: 400 });
  }

  try {
    await ensureSeeded();
    const db = await getDb();
    const member = await db.collection("team").findOne({ id: params.id }, { projection: { _id: 0, role: 1 } });

    if (!member) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });
    }

    if (member.role === "admin") {
      const admins = await db.collection("team").countDocuments({ role: "admin" });
      if (admins <= 1) {
        return NextResponse.json({ error: "Mantenha pelo menos um admin no painel." }, { status: 400 });
      }
    }

    await db.collection("team").deleteOne({ id: params.id });
    return NextResponse.json({ ok: true, id: params.id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
