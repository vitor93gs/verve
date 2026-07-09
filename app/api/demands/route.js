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

    if (!title || !client) {
      return NextResponse.json({ error: "Demand title and client are required." }, { status: 400 });
    }

    await ensureSeeded();
    const demand = {
      id: `d${Date.now()}`,
      client,
      title,
      respId: body.respId || "",
      stage: "pauta",
      deadline: body.deadline || "",
      done: false,
      createdAt: new Date()
    };

    const db = await getDb();
    await db.collection("demands").insertOne(demand);

    return NextResponse.json({ ...demand, _id: undefined }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
