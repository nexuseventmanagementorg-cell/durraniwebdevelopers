import { execFile as execFileCallback } from "child_process";
import { randomUUID } from "crypto";
import { lstat, mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import { promisify } from "util";
import { dirname, join, relative, resolve, sep } from "path";
import type { WorkforceBatch } from "@/lib/workforce-pipeline";
import type { TemplateConcept } from "@/lib/ollama-provider";
import { getGeneratedTemplatesDirectory, getWorkforceStorageRoot } from "@/lib/workforce-storage";

const execFile = promisify(execFileCallback);
const EDITIONS = ["starter", "business", "enterprise"] as const;
type Edition = (typeof EDITIONS)[number];

const EDITION_FEATURES: Record<Edition, string[]> = {
  starter: [
    "Responsive home, about, services, and contact sections",
    "Accessible navigation and essential metadata",
    "Contact form demonstration (does not send or store information)",
  ],
  business: [
    "Everything in Starter",
    "Searchable offerings list",
    "Customer testimonial and frequently asked questions sections",
  ],
  enterprise: [
    "Everything in Business",
    "Expanded service discovery and business information",
    "Documented static-site extension points; no backend integrations are included",
  ],
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeSlug(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug || slug.length > 60 || slug.includes("..")) throw new Error("Generated concept has an unsafe output slug.");
  return slug;
}

function editionContent(edition: Edition, concept: TemplateConcept): {
  featureSections: string;
  extraStyles: string;
  script: string;
} {
  const offerings = concept.offerings.map((item, index) => `
    <article class="offering" data-search="${escapeHtml(item.toLowerCase())}">
      <span class="offering-number">0${index + 1}</span>
      <h3>${escapeHtml(item)}</h3>
      <p>Explore ${escapeHtml(item.toLowerCase())} designed around the needs of ${escapeHtml(concept.audience.toLowerCase())}.</p>
    </article>`).join("");
  const common = `
    <section class="section" id="services">
      <div class="section-heading"><p class="eyebrow">What we offer</p><h2>Thoughtful solutions for your next step.</h2></div>
      ${edition === "starter" ? "" : '<label class="search"><span>Find a service</span><input id="offering-search" type="search" placeholder="Search offerings" autocomplete="off"></label>'}
      <div class="offerings" id="offerings">${offerings}</div>
    </section>`;
  const business = edition === "starter" ? "" : `
    <section class="section muted" id="stories">
      <div class="section-heading"><p class="eyebrow">Built around people</p><h2>Clear service. Considered details.</h2></div>
      <div class="quote"><p>“A helpful team, a clear process, and service that feels made for our business.”</p><span>— Sample customer story for preview purposes</span></div>
    </section>
    <section class="section" id="faq">
      <div class="section-heading"><p class="eyebrow">Questions</p><h2>Good to know before you begin.</h2></div>
      <details><summary>How do I get started?</summary><p>Use the contact section to discuss the right service for your needs.</p></details>
      <details><summary>Can I request a tailored solution?</summary><p>Yes. Share your goals and the business can discuss a suitable scope.</p></details>
    </section>`;
  const enterprise = edition === "enterprise" ? `
    <section class="section dark" id="business">
      <div class="section-heading"><p class="eyebrow">Business overview</p><h2>A flexible starting point for a growing organization.</h2></div>
      <div class="metrics"><div><strong>${concept.offerings.length}</strong><span>Sample service areas</span></div><div><strong>3</strong><span>Clear next-step sections</span></div><div><strong>0</strong><span>External services connected</span></div></div>
      <p class="disclaimer">This edition is a static front-end template. The figures above describe the sample content only; no live business analytics or external integrations are connected.</p>
    </section>` : "";
  const filterScript = edition === "starter" ? "" : `
const search = document.querySelector("#offering-search");
search?.addEventListener("input", () => {
  const query = search.value.trim().toLowerCase();
  document.querySelectorAll(".offering").forEach((card) => {
    card.hidden = !card.dataset.search.includes(query);
  });
});`;
  return {
    featureSections: `${common}${business}${enterprise}`,
    extraStyles: edition === "starter" ? "" : `
.search { display: grid; gap: .45rem; max-width: 24rem; margin: 0 0 1.5rem; color: var(--muted); font-size: .85rem; }
.search input { width: 100%; padding: .8rem 1rem; color: var(--ink); background: white; border: 1px solid var(--line); border-radius: .75rem; }
.quote { padding: clamp(1.5rem, 5vw, 3rem); color: white; background: var(--ink); border-radius: 1.25rem; }
.quote p { max-width: 48rem; font-size: clamp(1.25rem, 3vw, 2rem); }
.quote span, .disclaimer { color: var(--muted); font-size: .82rem; }
details { padding: 1.1rem 0; border-bottom: 1px solid var(--line); }
summary { cursor: pointer; font-weight: 700; }
details p { color: var(--muted); }
${edition === "enterprise" ? ".dark { color: white; background: var(--ink); border-radius: 1.25rem; padding: clamp(1.5rem, 5vw, 3rem); }.dark .eyebrow { color: #ffb6bf; }.metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 1rem; margin: 2rem 0; }.metrics div { display: grid; gap: .35rem; padding: 1.1rem; border: 1px solid #444a55; border-radius: .8rem; }.metrics strong { font-size: 2rem; }.metrics span { color: #c2c7d0; font-size: .8rem; }" : ""}
`,
    script: `${filterScript}
const form = document.querySelector("#contact-form");
const status = document.querySelector("#form-status");
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  status.textContent = "Demo only: no message was sent or stored.";
  form.reset();
});
document.querySelector("#year").textContent = String(new Date().getFullYear());`,
  };
}

function renderHtml(concept: TemplateConcept, edition: Edition): string {
  const content = editionContent(edition, concept);
  const title = `${concept.name} | ${edition[0].toUpperCase()}${edition.slice(1)} Edition`;
  const offeringCards = content.featureSections;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(concept.description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="styles.css">
  <script defer src="app.js"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="#home" aria-label="${escapeHtml(concept.name)} home">${escapeHtml(concept.name)}</a>
    <nav aria-label="Main navigation"><a href="#about">About</a><a href="#services">Services</a>${edition === "starter" ? "" : '<a href="#faq">FAQ</a>'}<a class="nav-cta" href="#contact">Contact</a></nav>
  </header>
  <main id="main">
    <section class="hero" id="home">
      <div class="hero-copy"><p class="eyebrow">${escapeHtml(concept.audience)}</p><h1>${escapeHtml(concept.tagline)}</h1><p>${escapeHtml(concept.description)}</p><a class="button" href="#services">Explore services <span aria-hidden="true">→</span></a></div>
      <div class="hero-art" aria-hidden="true"><div class="art-ring"></div><div class="art-card"><span>Made for</span><strong>${escapeHtml(concept.businessTypeId.replace(/-/g, " "))}</strong></div></div>
    </section>
    <section class="section about" id="about"><div class="section-heading"><p class="eyebrow">About ${escapeHtml(concept.name)}</p><h2>A dependable partner for your next chapter.</h2></div><p>${escapeHtml(concept.description)} We focus on clear communication and a practical approach, so you can choose a service with confidence.</p></section>
    ${offeringCards}
    <section class="section contact" id="contact"><div><p class="eyebrow">Get in touch</p><h2>Let's talk about what you need.</h2><p>Share a few details and the team can follow up about a suitable next step.</p></div><form id="contact-form"><label>Your name<input name="name" required autocomplete="name"></label><label>What can we help with?<textarea name="message" rows="4" required></textarea></label><button class="button" type="submit">Preview form</button><p id="form-status" role="status" aria-live="polite"></p></form></section>
  </main>
  <footer><span>${escapeHtml(concept.name)} · ${edition[0].toUpperCase()}${edition.slice(1)} Edition</span><span>© <span id="year"></span> · Website concept template</span></footer>
</body>
</html>`;
}

function renderCss(edition: Edition): string {
  const additional = editionContent(edition, {
    businessTypeId: "business",
    name: "Business",
    slug: "business",
    tagline: "A welcoming business.",
    audience: "Customers",
    description: "A sample business description.",
    offerings: ["Services", "Support", "Consultation"],
  }).extraStyles;
  return `:root{color-scheme:light;--ink:#17232b;--muted:#66747a;--line:#dce4e1;--accent:#d76b4e;--accent-dark:#a44534;--paper:#fbf8f2;--surface:#fff}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:var(--paper);font:16px/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:inherit}.skip-link{position:absolute;left:-9999px;top:1rem;background:#fff;padding:.7rem;z-index:5}.skip-link:focus{left:1rem}.site-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem clamp(1rem,5vw,5rem);background:rgba(251,248,242,.96);border-bottom:1px solid var(--line)}.brand{text-decoration:none;font-weight:850;letter-spacing:-.04em}.site-header nav{display:flex;align-items:center;gap:clamp(.65rem,2vw,1.5rem);font-size:.85rem}.site-header nav a{text-decoration:none}.nav-cta{padding:.55rem .9rem;border:1px solid var(--line);border-radius:99px}.hero{display:grid;grid-template-columns:1.15fr .85fr;align-items:center;gap:2rem;min-height:34rem;padding:clamp(3rem,8vw,7rem) clamp(1rem,8vw,8rem);background:radial-gradient(ellipse at 82% 45%,#f1d8bd 0,transparent 37%),linear-gradient(125deg,#f8f2e8,#edf1e8)}.hero-copy{max-width:44rem}.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:.72rem;font-weight:800;color:var(--accent-dark)}h1,h2,h3,p{margin-top:0}h1{max-width:13ch;margin:.7rem 0 1rem;font-size:clamp(2.6rem,6.8vw,5.8rem);line-height:.98;letter-spacing:-.065em}h2{max-width:19ch;font-size:clamp(1.8rem,4vw,3rem);line-height:1.08;letter-spacing:-.045em}.hero-copy>p:not(.eyebrow),.about>p,.contact>div>p:last-child{max-width:40rem;color:var(--muted)}.button{display:inline-flex;align-items:center;gap:.8rem;margin-top:1rem;padding:.85rem 1.15rem;border:0;border-radius:99px;color:#fff;background:var(--accent-dark);text-decoration:none;font:inherit;font-weight:750;cursor:pointer}.hero-art{position:relative;display:grid;place-items:center;min-height:20rem}.art-ring{width:min(27vw,20rem);aspect-ratio:1;border:1px solid #c78d73;border-radius:50%;box-shadow:0 0 0 2rem rgba(215,107,78,.09),0 0 0 4rem rgba(215,107,78,.05)}.art-card{position:absolute;display:grid;gap:.4rem;padding:1.5rem 2rem;background:#fff;border-radius:1rem;box-shadow:0 1.5rem 4rem #35403c22;transform:rotate(-5deg)}.art-card span{color:var(--muted);font-size:.8rem}.art-card strong{text-transform:capitalize;font-size:1.4rem}.section{padding:clamp(3rem,7vw,6rem) clamp(1rem,8vw,8rem)}.section-heading{margin-bottom:1.5rem}.about{display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:start}.about>p{padding-top:2rem}.offerings{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1rem}.offering{min-height:13rem;padding:1.3rem;background:var(--surface);border:1px solid var(--line);border-radius:1rem}.offering-number{color:var(--accent-dark);font-size:.75rem;font-weight:800}.offering h3{margin:.8rem 0 .45rem}.offering p{margin:0;color:var(--muted);font-size:.9rem}.muted{background:#f1eee7}.contact{display:grid;grid-template-columns:1fr 1fr;gap:3rem;background:#f1eee7}.contact form{display:grid;gap:.8rem}.contact label{display:grid;gap:.35rem;font-size:.85rem;font-weight:700}.contact input,.contact textarea{width:100%;padding:.8rem;border:1px solid var(--line);border-radius:.6rem;background:white;font:inherit}.contact button{justify-self:start;margin:0}#form-status{min-height:1.4em;font-size:.85rem;color:var(--accent-dark)}footer{display:flex;justify-content:space-between;gap:1rem;padding:1.5rem clamp(1rem,8vw,8rem);font-size:.8rem;color:var(--muted);border-top:1px solid var(--line)}[hidden]{display:none!important}${additional}
@media(max-width:700px){.hero{grid-template-columns:1fr;min-height:auto}.hero-art{min-height:13rem}.art-ring{width:10rem}.about,.contact{grid-template-columns:1fr}.about>p{padding-top:0}.site-header{align-items:flex-start}.site-header nav{flex-wrap:wrap;justify-content:flex-end}.site-header nav a{font-size:.78rem}footer{flex-direction:column}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`;
}

function renderScript(concept: TemplateConcept, edition: Edition): string {
  return editionContent(edition, concept).script;
}

function featureMatrix(concept: TemplateConcept, edition: Edition) {
  return {
    businessType: concept.businessTypeId,
    edition,
    included: EDITION_FEATURES[edition],
    notIncluded: [
      "No connected backend, database, authentication, payment gateway, or booking service",
      "Contact form is a front-end demonstration and does not transmit or store information",
      "No production analytics or third-party integrations",
    ],
  };
}

async function writeEdition(
  root: string,
  concept: TemplateConcept,
  edition: Edition,
  batch: WorkforceBatch,
  templateIndex: number
): Promise<{ path: string; checks: NonNullable<WorkforceBatch["qaReport"]>["checks"] }> {
  const templateDirectory = `template-${String(templateIndex + 1).padStart(2, "0")}-${safeSlug(concept.slug)}`;
  const destination = join(root, templateDirectory, edition);
  await mkdir(destination, { recursive: true });
  const manifest = {
    template: concept.name,
    businessType: concept.businessTypeId,
    concept: {
      tagline: concept.tagline,
      audience: concept.audience,
      description: concept.description,
      offerings: concept.offerings,
    },
    edition,
    features: EDITION_FEATURES[edition],
    framework: "Static HTML, CSS, and vanilla JavaScript",
    dependencies: [],
    buildStatus: "not_applicable_static_project",
    testResults: "See qa-report.json; only listed checks are claimed.",
    generatedAt: batch.scheduledDate,
    model: batch.model,
    artifactPaths: ["index.html", "styles.css", "app.js", "README.md", "feature-matrix.json", "manifest.json", "qa-report.json"],
  };
  const readme = `# ${concept.name} — ${edition[0].toUpperCase()}${edition.slice(1)} Edition

Static ${concept.businessTypeId} website concept generated for batch ${batch.id}.

## Run locally

Open \`index.html\` in a browser, or start a static server from this folder:

\`\`\`powershell
py -m http.server 8000
\`\`\`

No package installation is required. This is a front-end template, not a connected production service.

## Included in this edition

${EDITION_FEATURES[edition].map((feature) => `- ${feature}`).join("\n")}

## Limitations

- The contact form is a demo. It sends and stores no information.
- No payment, booking, authentication, database, or external integration is configured.
- Read \`feature-matrix.json\` and \`qa-report.json\` before using this template.
`;
  await Promise.all([
    writeFile(join(destination, "index.html"), renderHtml(concept, edition), "utf8"),
    writeFile(join(destination, "styles.css"), renderCss(edition), "utf8"),
    writeFile(join(destination, "app.js"), renderScript(concept, edition), "utf8"),
    writeFile(join(destination, "README.md"), readme, "utf8"),
    writeFile(join(destination, "feature-matrix.json"), JSON.stringify(featureMatrix(concept, edition), null, 2), "utf8"),
    writeFile(join(destination, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8"),
  ]);
  const checks: NonNullable<WorkforceBatch["qaReport"]>["checks"] = [];
  const requiredFiles = manifest.artifactPaths.filter((file) => !["qa-report.json"].includes(file));
  const missingFiles = await Promise.all(requiredFiles.map(async (file) => {
    try {
      await readFile(join(destination, file));
      return null;
    } catch {
      return file;
    }
  }));
  const missing = missingFiles.filter((file): file is string => Boolean(file));
  checks.push({
    name: `${concept.slug}/${edition}: required files`,
    status: missing.length === 0 ? "passed" : "failed",
    evidence: missing.length === 0 ? `${requiredFiles.length} required files readable` : `Missing: ${missing.join(", ")}`,
  });
  const html = await readFile(join(destination, "index.html"), "utf8");
  const hasMetadata = /<title>[^<]+<\/title>/.test(html) && /<meta name="description"/.test(html);
  checks.push({
    name: `${concept.slug}/${edition}: SEO metadata`,
    status: hasMetadata ? "passed" : "failed",
    evidence: hasMetadata ? "Title and description metadata found" : "Title or description metadata missing",
  });
  const anchorTargets = Array.from(html.matchAll(/href="#([^"]+)"/g), (match) => match[1]);
  const missingAnchors = anchorTargets.filter((target) => !new RegExp(`id="${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(html));
  checks.push({
    name: `${concept.slug}/${edition}: local navigation targets`,
    status: missingAnchors.length === 0 ? "passed" : "failed",
    evidence: missingAnchors.length === 0 ? `${anchorTargets.length} in-page links resolve` : `Missing targets: ${missingAnchors.join(", ")}`,
  });
  try {
    const result = await execFile(process.execPath, ["--check", join(destination, "app.js")], {
      timeout: 10_000,
      windowsHide: true,
      maxBuffer: 128 * 1024,
    });
    checks.push({
      name: `${concept.slug}/${edition}: JavaScript syntax`,
      status: result.stderr ? "failed" : "passed",
      evidence: result.stderr || "node --check exited 0",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "JavaScript syntax check failed.";
    checks.push({ name: `${concept.slug}/${edition}: JavaScript syntax`, status: "failed", evidence: message });
  }
  await writeFile(
    join(destination, "qa-report.json"),
    JSON.stringify({
      edition,
      passed: checks.filter((check) => check.status === "passed").length,
      failed: checks.filter((check) => check.status === "failed").length,
      checks,
      browserSmokeTest: "NOT RUN",
    }, null, 2),
    "utf8"
  );
  return { path: relative(process.cwd(), destination).split(sep).join("/"), checks };
}

async function mapWithLimit<T, R>(items: T[], limit: number, run: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let failure: unknown;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      if (failure) return;
      const index = next++;
      if (index >= items.length) return;
      try {
        results[index] = await run(items[index], index);
      } catch (error) {
        failure = error;
      }
    }
  }));
  if (failure) throw failure;
  return results;
}

export async function generateWorkforceTemplateArtifacts(input: {
  batch: WorkforceBatch;
  concepts: TemplateConcept[];
  maxConcurrency: number;
}): Promise<{
  artifacts: string[];
  qaReport: NonNullable<WorkforceBatch["qaReport"]>;
}> {
  if (!/^batch-\d{4}-\d{2}-\d{2}$/.test(input.batch.id) ||
      input.concepts.length !== 5 ||
      !Number.isInteger(input.maxConcurrency) ||
      input.maxConcurrency < 1 ||
      input.maxConcurrency > 3) {
    throw new Error("The generated batch scope is invalid.");
  }
  const outputRoot = resolve(getGeneratedTemplatesDirectory());
  await mkdir(outputRoot, { recursive: true });
  if ((await lstat(outputRoot)).isSymbolicLink()) {
    throw new Error("Generated template output must not resolve through a symlink.");
  }
  const batchRoot = join(outputRoot, input.batch.scheduledDate, input.batch.id);
  let existingInfo: Awaited<ReturnType<typeof lstat>> | null = null;
  try {
    existingInfo = await lstat(batchRoot);
  } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") throw error;
  }
  if (existingInfo) {
    if (!existingInfo.isDirectory() || existingInfo.isSymbolicLink()) {
      throw new Error("The existing batch output is not a safe directory.");
    }
    const existingConcepts = JSON.parse(await readFile(join(batchRoot, "concepts.json"), "utf8")) as TemplateConcept[];
    const existingManifest = JSON.parse(await readFile(join(batchRoot, "manifest.json"), "utf8")) as {
      batchId?: string;
      totalDeliverables?: number;
      qaFailed?: number;
      qaPassed?: number;
    };
    const existingReport = JSON.parse(await readFile(join(batchRoot, "batch-report.json"), "utf8")) as {
      qaReport?: NonNullable<WorkforceBatch["qaReport"]>;
    };
    if (existingManifest.batchId !== input.batch.id ||
        existingManifest.totalDeliverables !== 15 ||
        existingManifest.qaFailed !== 0 ||
        !existingReport.qaReport ||
        !Array.isArray(existingReport.qaReport?.checks) ||
        existingReport.qaReport.failed !== 0 ||
        JSON.stringify(existingConcepts) !== JSON.stringify(input.concepts)) {
      throw new Error("A different or incomplete output already exists for this batch; it will not be overwritten.");
    }
    const artifacts = [
      `generated-templates/${input.batch.scheduledDate}/${input.batch.id}/concepts.json`,
      ...input.concepts.flatMap((concept, index) =>
        EDITIONS.map((edition) =>
          `generated-templates/${input.batch.scheduledDate}/${input.batch.id}/template-${String(index + 1).padStart(2, "0")}-${safeSlug(concept.slug)}/${edition}`
        )
      ),
      `generated-templates/${input.batch.scheduledDate}/${input.batch.id}/manifest.json`,
      `generated-templates/${input.batch.scheduledDate}/${input.batch.id}/batch-report.json`,
    ];
    return { artifacts, qaReport: existingReport.qaReport };
  }
  const stageRoot = join(outputRoot, `.staging-${randomUUID()}`);
  const stagePath = join(stageRoot, input.batch.id);
  try {
    await mkdir(stageRoot, { recursive: false });
    await mkdir(stagePath, { recursive: false });
    await writeFile(join(stagePath, "concepts.json"), JSON.stringify(input.concepts, null, 2), "utf8");
    const perConcept = await mapWithLimit(input.concepts, input.maxConcurrency, async (concept, index) => {
      const editions = await Promise.all(EDITIONS.map((edition) => writeEdition(stagePath, concept, edition, input.batch, index)));
      return editions;
    });
    const checks = perConcept.flatMap((entries) => entries.flatMap((entry) => entry.checks));
    const qaReport = {
      passed: checks.filter((check) => check.status === "passed").length,
      failed: checks.filter((check) => check.status === "failed").length,
      notRun: 1,
      checks: [
        ...checks,
        {
          name: "Browser smoke test",
          status: "not_run" as const,
          evidence: "NOT RUN: no isolated browser automation is configured for generated projects.",
        },
      ],
    };
    const batchReport = {
      batchId: input.batch.id,
      generatedAt: new Date().toISOString(),
      model: input.batch.model,
      templates: input.concepts.map((concept, index) => ({
        businessType: concept.businessTypeId,
        concept: concept.name,
        directory: `template-${String(index + 1).padStart(2, "0")}-${safeSlug(concept.slug)}`,
        editions: EDITIONS.map((edition) => ({
          edition,
          features: EDITION_FEATURES[edition],
          artifactPaths: [
            `template-${String(index + 1).padStart(2, "0")}-${safeSlug(concept.slug)}/${edition}/index.html`,
            `template-${String(index + 1).padStart(2, "0")}-${safeSlug(concept.slug)}/${edition}/manifest.json`,
            `template-${String(index + 1).padStart(2, "0")}-${safeSlug(concept.slug)}/${edition}/qa-report.json`,
          ],
        })),
      })),
      qaReport,
    };
    await writeFile(join(stagePath, "batch-report.json"), JSON.stringify(batchReport, null, 2), "utf8");
    const manifest = {
      batchId: input.batch.id,
      generationDate: input.batch.scheduledDate,
      model: input.batch.model,
      templates: input.concepts.map((concept, index) => ({
        businessType: concept.businessTypeId,
        concept: concept.name,
        editions: EDITIONS.map((edition) => ({
          edition,
          features: EDITION_FEATURES[edition],
          artifactPaths: [
            `template-${String(index + 1).padStart(2, "0")}-${safeSlug(concept.slug)}/${edition}/index.html`,
            `template-${String(index + 1).padStart(2, "0")}-${safeSlug(concept.slug)}/${edition}/manifest.json`,
            `template-${String(index + 1).padStart(2, "0")}-${safeSlug(concept.slug)}/${edition}/qa-report.json`,
          ],
        })),
      })),
      totalDeliverables: input.concepts.length * EDITIONS.length,
      conceptArtifact: "concepts.json",
      qaPassed: qaReport.passed,
      qaFailed: qaReport.failed,
      browserSmokeTest: "NOT RUN",
    };
    await writeFile(join(stagePath, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
    if (qaReport.failed > 0) throw new Error("Generated template QA checks failed; inspect the batch report.");
    const dateRoot = dirname(batchRoot);
    await mkdir(dateRoot, { recursive: true });
    if ((await lstat(dateRoot)).isSymbolicLink()) {
      throw new Error("Generated template date directory must not be a symlink.");
    }
    await rename(stagePath, batchRoot);
    return {
      artifacts: [
        relative(getWorkforceStorageRoot(), join(batchRoot, "concepts.json")).split(sep).join("/"),
        ...input.concepts.flatMap((concept, index) =>
          EDITIONS.map((edition) =>
            relative(
              getWorkforceStorageRoot(),
              join(batchRoot, `template-${String(index + 1).padStart(2, "0")}-${safeSlug(concept.slug)}`, edition)
            ).split(sep).join("/")
          )
        ),
        relative(getWorkforceStorageRoot(), join(batchRoot, "manifest.json")).split(sep).join("/"),
        relative(getWorkforceStorageRoot(), join(batchRoot, "batch-report.json")).split(sep).join("/"),
      ],
      qaReport,
    };
  } catch (error) {
    await rm(stageRoot, { recursive: true, force: true });
    throw error;
  }
}

export async function removeCancelledWorkforceArtifacts(batch: WorkforceBatch): Promise<void> {
  if (!/^batch-\d{4}-\d{2}-\d{2}$/.test(batch.id) ||
      batch.id !== `batch-${batch.scheduledDate}` ||
      !/^\d{4}-\d{2}-\d{2}$/.test(batch.scheduledDate)) {
    throw new Error("Cancelled batch output path is invalid.");
  }
  const outputRoot = resolve(getGeneratedTemplatesDirectory());
  try {
    if ((await lstat(outputRoot)).isSymbolicLink()) {
      throw new Error("Generated template output must not resolve through a symlink.");
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
  const dateDirectory = join(outputRoot, batch.scheduledDate);
  const batchDirectory = join(dateDirectory, batch.id);
  try {
    const dateInfo = await lstat(dateDirectory);
    const batchInfo = await lstat(batchDirectory);
    if (dateInfo.isSymbolicLink() || !dateInfo.isDirectory() ||
        batchInfo.isSymbolicLink() || !batchInfo.isDirectory()) {
      throw new Error("Cancelled batch artifacts are not stored in a safe generated directory.");
    }
    await rm(batchDirectory, { recursive: true, force: false });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
}
