import { NextResponse } from "next/server";
import { getSession, isAuthenticated, unauthorized } from "@/lib/auth";
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
    const current = await db.collection("demands").findOne({ id: params.id }, { projection: { _id: 0 } });

    if (!current) {
      return NextResponse.json({ error: "Demand not found." }, { status: 404 });
    }

    const session = getSession();
    const historyEntry = {
      action: "updated",
      at: new Date(),
      by: session ? { id: session.id, name: session.name, email: session.email } : null,
      changes: Object.fromEntries(
        Object.entries(update).map(([key, value]) => [key, { from: current[key] ?? "", to: value }])
      )
    };
    const result = await db.collection("demands").findOneAndUpdate(
      { id: params.id },
      {
        $set: { ...update, updatedAt: new Date() },
        $push: { history: historyEntry }
      },
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

export async function DELETE(request, { params }) {
  if (!isAuthenticated()) {
    return unauthorized();
  }

  try {
    await ensureSeeded();
    const db = await getDb();
    const current = await db.collection("demands").findOne({ id: params.id }, { projection: { _id: 0 } });

    if (!current) {
      return NextResponse.json({ error: "Demand not found." }, { status: 404 });
    }

    const session = getSession();
    const now = new Date();
    const result = await db.collection("demands").findOneAndUpdate(
      { id: params.id },
      {
        $set: { archivedAt: now, updatedAt: now },
        $push: {
          history: {
            action: "archived",
            at: now,
            by: session ? { id: session.id, name: session.name, email: session.email } : null
          }
        }
      },
      { projection: { _id: 0 }, returnDocument: "after" }
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
