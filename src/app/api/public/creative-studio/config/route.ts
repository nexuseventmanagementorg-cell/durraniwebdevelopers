import { NextResponse } from "next/server";
import { getCreativeStudioConfig, CreativeStudioStorageError } from "@/lib/creative-studio-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getCreativeStudioConfig();
    return NextResponse.json(
      { success: true, config },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    const message = error instanceof CreativeStudioStorageError
      ? error.message
      : "Creative Studio pricing could not be loaded.";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}
