import { NextResponse } from "next/server";
import { isAuthenticated, unauthorized } from "@/lib/auth";
import { ensureSeeded } from "@/lib/data";
import { sendDemandNotification } from "@/lib/email";
import { getDb } from "@/lib/mongodb";

export async function POST(request, { params }) {
  if (!isAuthenticated()) {
    return unauthorized();
  }

  try {
    await ensureSeeded();
    const db = await getDb();
    const demand = await db.collection("demands").findOne({ id: params.id }, { projection: { _id: 0 } });

    if (!demand) {
      return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 });
    }

    if (!demand.respId) {
      return NextResponse.json({ error: "Demanda sem responsável." }, { status: 400 });
    }

    const responsible = await db.collection("team").findOne(
      { id: demand.respId },
      { projection: { _id: 0, passwordHash: 0 } }
    );

    if (!responsible) {
      return NextResponse.json({ error: "Responsável não encontrado." }, { status: 404 });
    }

    await sendDemandNotification({ demand, responsible });

    return NextResponse.json({
      ok: true,
      sentTo: responsible.email,
      sentAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
