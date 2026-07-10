import { NextResponse } from "next/server";
import { getSession, isAuthenticated, unauthorized } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { demandStages, monthlyStages, tabs } from "@/lib/seedData";

export async function GET() {
  if (!isAuthenticated()) {
    return unauthorized();
  }

  try {
    const data = await getDashboardData();
    return NextResponse.json({
      ...data,
      currentUser: getSession(),
      demandStages,
      monthlyStages,
      tabs
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
