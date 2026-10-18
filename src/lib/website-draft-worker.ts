import type { Project, WebsiteDraft } from "@/lib/types";

type WebsiteDraftInput = Pick<Project, "name" | "category" | "description" | "selectedFeatures">;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function formatFeature(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function buildWebsiteDraft(
  project: WebsiteDraftInput,
  generatedAt = new Date().toISOString()
): WebsiteDraft {
  const name = escapeHtml(project.name.trim() || "Your Business");
  const category = escapeHtml(project.category.trim() || "Custom web application");
  const description = escapeHtml(project.description.trim() || "Project content will be confirmed with the client.");
  const features = Array.from(new Set(project.selectedFeatures.map(formatFeature).filter(Boolean)));
  const featureCards = features.length > 0
    ? features.map((feature) => `<article class="feature"><span aria-hidden="true">+</span><h3>${escapeHtml(feature)}</h3></article>`).join("")
    : `<article class="feature"><span aria-hidden="true">+</span><h3>Features to be confirmed</h3></article>`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;">
  <title>${name} | Website concept</title>
  <style>
    :root{color-scheme:light;--ink:#17211d;--muted:#59665f;--paper:#f7f8f4;--accent:#b6462f;--line:#dce2db}
    *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 Georgia,'Times New Roman',serif}
    .shell{max-width:1080px;margin:auto;padding:24px clamp(20px,6vw,72px)}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding:8px 0 18px;font:700 13px/1.3 Arial,sans-serif}
    .mark{color:var(--accent);font-size:12px;text-transform:uppercase}.badge{color:var(--muted);font-size:11px;font-weight:600}
    .hero{padding:clamp(56px,10vw,120px) 0 72px;max-width:760px}.eyebrow{color:var(--accent);font:700 12px Arial,sans-serif;text-transform:uppercase}
    h1{font-size:clamp(42px,8vw,82px);line-height:.98;margin:18px 0 24px}.intro{max-width:620px;color:var(--muted);font-size:20px;line-height:1.55}
    .button{display:inline-block;margin-top:24px;padding:13px 18px;background:var(--ink);color:#fff;text-decoration:none;font:700 13px Arial,sans-serif;border-radius:3px}
    section{border-top:1px solid var(--line);padding:44px 0}.section-label{color:var(--accent);font:700 11px Arial,sans-serif;text-transform:uppercase}h2{font-size:clamp(28px,4vw,42px);line-height:1.1;margin:10px 0 22px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.feature{min-height:112px;background:#fff;border:1px solid var(--line);padding:18px}.feature span{color:var(--accent);font:700 20px Arial,sans-serif}.feature h3{font:700 15px/1.3 Arial,sans-serif;margin:10px 0 0}
    .note{background:#eef1e9;padding:18px;color:var(--muted);font:13px/1.6 Arial,sans-serif}footer{border-top:1px solid var(--line);padding:22px 0;color:var(--muted);font:11px/1.5 Arial,sans-serif}
    @media(max-width:560px){header{align-items:flex-start;gap:12px;flex-direction:column}.hero{padding-top:60px}.intro{font-size:18px}}
  </style>
</head>
<body>
  <div class="shell">
    <header><span class="mark">${name}</span><span class="badge">${category}</span></header>
    <main>
      <div class="hero"><p class="eyebrow">A first look at your project</p><h1>${name}</h1><p class="intro">${description}</p><a class="button" href="#planned-scope">Explore the planned scope</a></div>
      <section id="planned-scope"><p class="section-label">Based on the approved project scope</p><h2>Designed around your requirements.</h2><div class="grid">${featureCards}</div></section>
      <p class="note">Concept preview only. This template does not implement the listed features, connect a database, or represent client-approved final content.</p>
    </main>
    <footer>Generated from the approved project record. No client contact details or payment information are included.</footer>
  </div>
</body>
</html>`;

  return { generatedAt, generator: "template-v1", html };
}