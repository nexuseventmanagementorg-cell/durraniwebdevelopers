import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { verifyAdminRequest } from "@/lib/auth";
import {
  CreativeStudioStorageError,
  getCreativeInquiry,
  getCreativeReferenceUrl,
} from "@/lib/creative-studio-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const inquiryId = request.nextUrl.searchParams.get("inquiry") || "";
  const index = Number(request.nextUrl.searchParams.get("file"));
  if (!inquiryId || !Number.isInteger(index) || index < 0) {
    return NextResponse.json({ success: false, error: "A valid inquiry and file are required." }, { status: 400 });
  }

  try {
    const inquiry = await getCreativeInquiry(inquiryId);
    const file = inquiry?.project.referenceFiles[index];
    if (!file) return NextResponse.json({ success: false, error: "Reference file not found." }, { status: 404 });

    if (file.path.startsWith("local:")) {
      const relativePath = file.path.slice("local:".length);
      if (!/^\d{4}\/[0-9a-f-]{36}\.(?:jpg|png|webp|mp4|webm)$/i.test(relativePath)) {
        return NextResponse.json({ success: false, error: "Reference file path is invalid." }, { status: 400 });
      }
      const root = path.resolve(process.cwd(), "data", "creative-studio-references");
      const filePath = path.resolve(root, relativePath);
      if (!filePath.startsWith(`${root}${path.sep}`)) {
        return NextResponse.json({ success: false, error: "Reference file path is invalid." }, { status: 400 });
      }
      const bytes = await readFile(filePath);
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": file.type,
          "Content-Length": String(bytes.byteLength),
          "Content-Disposition": `inline; filename="${file.name.replace(/["\\]/g, "")}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const signedUrl = await getCreativeReferenceUrl(file.path);
    if (!signedUrl) return NextResponse.json({ success: false, error: "Reference file is unavailable." }, { status: 404 });
    return NextResponse.redirect(signedUrl, 302);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({ success: false, error: "Reference file is unavailable." }, { status: 404 });
    }
    const message = error instanceof CreativeStudioStorageError
      ? error.message
      : "Reference file could not be opened.";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}
