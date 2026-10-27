import { NextRequest, NextResponse } from "next/server";
import { lstat, readFile } from "fs/promises";
import { isAbsolute, relative, resolve, sep } from "path";
import { getAdminFromRequest } from "@/lib/auth";
import { isLocalWorkforceEnabled } from "@/lib/workforce-pipeline";
import { getWorkforceStorageRoot } from "@/lib/workforce-storage";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isLocalWorkforceEnabled()) {
    return NextResponse.json({ success: false, error: "Generated previews are available only on the local workforce PC." }, { status: 503 });
  }
  const segments = context.params.path;
  if (!segments?.length ||
      segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\") || segment.includes("\0"))) {
    return NextResponse.json({ success: false, error: "A valid generated artifact path is required." }, { status: 400 });
  }
  const extension = segments[segments.length - 1].slice(segments[segments.length - 1].lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return NextResponse.json({ success: false, error: "This artifact type cannot be previewed." }, { status: 415 });
  }
  const isInquiryAgentHtml = segments.length === 5 &&
    segments[0] === "projects" &&
    segments[1] === "DW-944529-ahlam-collections-preview" &&
    segments[2] === "agent-generated-store" &&
    /^agent-build-[\dT-]+Z(?:-\d+)?$/.test(segments[3]) &&
    ["index.html", "admin.html"].includes(segments[4]);

  try {
    const outputRoot = resolve(getWorkforceStorageRoot());
    if ((await lstat(outputRoot)).isSymbolicLink()) {
      return NextResponse.json({ success: false, error: "Generated artifact storage must not resolve through a symlink." }, { status: 400 });
    }
    const candidate = resolve(outputRoot, ...segments);
    const relativeCandidate = relative(outputRoot, candidate);
    if (isAbsolute(relativeCandidate) || relativeCandidate === ".." || relativeCandidate.startsWith(`..${sep}`)) {
      return NextResponse.json({ success: false, error: "Artifact path is outside the generated template directory." }, { status: 400 });
    }
    let checkedPath = outputRoot;
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      checkedPath = resolve(checkedPath, segment);
      const info = await lstat(checkedPath);
      if (info.isSymbolicLink() || (index === segments.length - 1 ? !info.isFile() : !info.isDirectory())) {
        return NextResponse.json({ success: false, error: "Artifact symlinks and non-file paths are not allowed." }, { status: 400 });
      }
    }
    const content = await readFile(candidate);
    if (content.byteLength > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "The preview artifact exceeds the 2 MB limit." }, { status: 413 });
    }
    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": `sandbox allow-scripts; default-src 'self'; style-src 'self' 'unsafe-inline'; script-src ${isInquiryAgentHtml ? "'unsafe-inline'" : "'self'"}; connect-src 'none'; img-src 'self' data: blob: https://images.unsplash.com; form-action 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'`,
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({ success: false, error: "Generated artifact not found." }, { status: 404 });
    }
    console.error("Could not read workforce artifact", error);
    return NextResponse.json({ success: false, error: "Generated artifact could not be opened." }, { status: 500 });
  }
}
