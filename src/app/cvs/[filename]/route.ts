import { readFile } from "node:fs/promises";
import path from "node:path";

const cvFiles = new Map([
  ["kaleem-durrani.html", "text/html; charset=utf-8"],
  ["shamsa-durrani.html", "text/html; charset=utf-8"],
  ["kaleem-durrani-cv.pdf", "application/pdf"],
  ["shamsa-durrani-cv.pdf", "application/pdf"],
]);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { filename: string } }
) {
  const contentType = cvFiles.get(params.filename);
  if (!contentType) {
    return new Response("CV not found.", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", "cvs", params.filename);

  try {
    const file = await readFile(filePath);
    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(file.byteLength),
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      console.error(`CV file is missing from the deployment: ${params.filename}`);
      return new Response("CV file is temporarily unavailable.", { status: 503 });
    }

    throw error;
  }
}
