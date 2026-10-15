import { NextResponse } from "next/server";
import { DataStore } from "@/lib/store";

export async function GET() {
  try {
    const portfolio = DataStore.getPortfolio(false);
    return NextResponse.json({ success: true, portfolio });
  } catch (error) {
    console.error("Failed to fetch public portfolio", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch portfolio projects" },
      { status: 500 }
    );
  }
}
