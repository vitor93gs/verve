import { NextResponse } from "next/server";
import { isAuthenticated, unauthorized } from "@/lib/auth";
import { ensureSeeded } from "@/lib/data";
import { getDb } from "@/lib/mongodb";
import { monthlyStages } from "@/lib/seedData";

export async function POST(request) {
  if (!isAuthenticated()) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Client name is required." }, { status: 400 });
    }

    await ensureSeeded();
    const db = await getDb();
    const existing = await db.collection("clients").findOne({ name }, { projection: { _id: 0, id: 1 } });

    if (existing) {
      return NextResponse.json({ error: "Client already exists." }, { status: 409 });
    }

    const client = {
      id: `c${Date.now()}`,
      name,
      drive: body.drive?.trim() || "",
      docs: body.docs?.trim() || "",
      instagram: body.instagram?.trim() || "",
      stage: monthlyStages[0].key,
      createdAt: new Date()
    };

    await db.collection("clients").insertOne(client);

    return NextResponse.json({ ...client, _id: undefined }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
