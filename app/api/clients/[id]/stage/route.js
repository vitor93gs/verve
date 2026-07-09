import { NextResponse } from "next/server";
import { isAuthenticated, unauthorized } from "@/lib/auth";
import { ensureSeeded } from "@/lib/data";
import { getDb } from "@/lib/mongodb";
import { monthlyStages } from "@/lib/seedData";

export async function PATCH(request, { params }) {
  if (!isAuthenticated()) {
    return unauthorized();
  }

  try {
    const { stage } = await request.json();
    const isValidStage = monthlyStages.some((item) => item.key === stage);

    if (!isValidStage) {
      return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
    }

    await ensureSeeded();
    const db = await getDb();
    const result = await db.collection("clients").findOneAndUpdate(
      { id: params.id },
      { $set: { stage, updatedAt: new Date() } },
      { projection: { _id: 0 }, returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
