import { readFile } from "node:fs/promises";
import path from "node:path";

const cvFiles = ["kaleem-durrani.html", "shamsa-durrani.html"];

export const dynamic = "force-static";

export function generateStaticParams() {
  return cvFiles.map((filename) => ({ filename }));
}

export async function GET(
  _request: Request,
  { params }: { params: { filename: string } }
) {
  if (!cvFiles.includes(params.filename)) {
    return new Response("CV not found.", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", "cvs", params.filename);
  const html = await readFile(filePath, "utf8");

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
