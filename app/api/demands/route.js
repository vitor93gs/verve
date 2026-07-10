import { NextResponse } from "next/server";
import { isAuthenticated, unauthorized } from "@/lib/auth";
import { ensureSeeded } from "@/lib/data";
import { getDb } from "@/lib/mongodb";

export async function POST(request) {
  if (!isAuthenticated()) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const title = body.title?.trim();
    const client = body.client?.trim();
    const clientId = body.clientId?.trim();

    if (!title || !client || !clientId) {
      return NextResponse.json({ error: "Demand title and client are required." }, { status: 400 });
    }

    await ensureSeeded();
    const db = await getDb();
    const linkedClient = await db.collection("clients").findOne({ id: clientId, name: client }, { projection: { _id: 0, id: 1 } });

    if (!linkedClient) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    const demand = {
      id: `d${Date.now()}`,
      clientId,
      client,
      title,
      respId: body.respId || "",
      stage: "pauta",
      deadline: body.deadline || "",
      done: false,
      createdAt: new Date()
    };

    await db.collection("demands").insertOne(demand);

    return NextResponse.json({ ...demand, _id: undefined }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
