import { NextResponse } from "next/server";
import { isAuthenticated, unauthorized } from "@/lib/auth";
import { ensureSeeded } from "@/lib/data";
import { getDb } from "@/lib/mongodb";

const allowedFields = ["done", "stage", "respId", "deadline", "title"];

export async function PATCH(request, { params }) {
  if (!isAuthenticated()) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const update = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowedFields.includes(key))
    );

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No supported fields to update." }, { status: 400 });
    }

    await ensureSeeded();
    const db = await getDb();
    const result = await db.collection("demands").findOneAndUpdate(
      { id: params.id },
      { $set: { ...update, updatedAt: new Date() } },
      { projection: { _id: 0 }, returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Demand not found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
