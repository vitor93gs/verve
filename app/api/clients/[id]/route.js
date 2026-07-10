import { NextResponse } from "next/server";
import { isAuthenticated, unauthorized } from "@/lib/auth";
import { ensureSeeded } from "@/lib/data";
import { getDb } from "@/lib/mongodb";

export async function DELETE(request, { params }) {
  if (!isAuthenticated()) {
    return unauthorized();
  }

  try {
    await ensureSeeded();
    const db = await getDb();
    const client = await db.collection("clients").findOne({ id: params.id }, { projection: { _id: 0 } });

    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    await Promise.all([
      db.collection("clients").deleteOne({ id: params.id }),
      db.collection("demands").deleteMany({ $or: [{ clientId: params.id }, { client: client.name }] }),
      db.collection("metricsHistory").deleteOne({ clientId: params.id })
    ]);

    return NextResponse.json({ ok: true, id: params.id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
