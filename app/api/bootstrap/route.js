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
    const session = getSession();
    return NextResponse.json({
      ...data,
      currentUser: session,
      demandStages,
      monthlyStages,
      tabs: tabs.filter((tab) => !tab.adminOnly || session?.role === "admin")
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
