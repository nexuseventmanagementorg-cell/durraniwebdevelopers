import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { pathToFileURL } from "url";
import { Script } from "vm";
import { getWorkforceStorageRoot } from "../src/lib/workforce-storage";

type TaskStatus = "waiting" | "running" | "completed" | "failed";
type AgentRole = "Fashion UX Designer" | "Ecommerce Architect" | "Storefront Coder" | "Admin Dashboard Coder" | "QA Reviewer";

interface AgentTask {
  id: string;
  role: AgentRole;
  status: TaskStatus;
  model?: string;
  startedAt?: string;
  completedAt?: string;
  outputFile?: string;
  summary?: string;
  error?: string;
}

interface ProjectRun {
  inquiryId: string;
  project: string;
  runId: string;
  model: string;
  status: "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  prototypeDisclaimer: string;
  tasks: AgentTask[];
  qa: {
    passed: number;
    failed: number;
    checks: Array<{ name: string; passed: boolean; evidence: string }>;
  };
}

const INQUIRY_SCOPE = [
  "Business: Ahlam Collections, Pakistani traditional wear for women and men, based in Lahore.",
  "Customer goals: browse Pakistani clothing; choose stitched/made-to-measure or unstitched; upload a design-reference image; domestic and international delivery; product reviews; product photos and videos; admin product/order/sales/delivery management and analytics.",
  "Pricing rule supplied by customer: international product and stitching price should be twice the Pakistan base price. Do not invent a real catalog or final product prices. Any sample prices must be visibly labeled illustrative.",
  "Delivery preference: TCS and Leopards within Pakistan; DHL and UPS internationally. Carrier booking/tracking APIs are NOT configured.",
  "Customer wants advance payment for product, stitching and delivery. A payment provider is NOT selected/configured; do not collect payment or imply payment integration works.",
  "Design direction: polished editorial fashion ecommerce, immersive imagery and scroll-led storytelling; take high-level inspiration from Durrani Web Developers and its portfolio/templates, but do not copy any existing site's code, text, logo or assets.",
  "Only implement a local review prototype. Do not contact customers, transmit personal data, use credentials, book shipments, charge money, or deploy.",
].join("\n");

const DESIGN_SCHEMA = {
  type: "object",
  properties: { output: { type: "string", minLength: 300, maxLength: 5000 } },
  required: ["output"],
  additionalProperties: false,
};

const CODE_SCHEMA = {
  type: "object",
  properties: { html: { type: "string", minLength: 1500, maxLength: 45000 } },
  required: ["html"],
  additionalProperties: false,
};

const QA_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", minLength: 40, maxLength: 1200 },
    blockingIssues: { type: "array", maxItems: 8, items: { type: "string", maxLength: 300 } },
    followUps: { type: "array", maxItems: 8, items: { type: "string", maxLength: 300 } },
  },
  required: ["summary", "blockingIssues", "followUps"],
  additionalProperties: false,
};

const INQUIRY_CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; img-src 'self' data: blob: https://images.unsplash.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'">`;

function getLocalOllamaUrl(): URL {
  const url = new URL(process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434");
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    throw new Error("Inquiry agent refuses non-loopback Ollama endpoints.");
  }
  return url;
}

function parseJsonContent(content: string): Record<string, unknown> {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const value: unknown = JSON.parse(trimmed);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The local agent returned an invalid JSON object.");
  }
  return value as Record<string, unknown>;
}

function validateGeneratedHtml(role: string, value: unknown): string {
  if (typeof value !== "string" || value.length < 1500 || value.length > 45000) {
    throw new Error(`${role} returned HTML outside the accepted 1,500–45,000 character range.`);
  }
  let html = value.trim().replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/, "");
  if (!/^<!doctype html>/i.test(html) || !/<html\b/i.test(html) || !/<\/html>/i.test(html)) {
    throw new Error(`${role} did not return a complete HTML document.`);
  }
  if (!/<head\b[^>]*>/i.test(html)) throw new Error(`${role} did not return an HTML head for the security policy.`);
  html = html
    .replace(/<meta\b(?=[^>]*http-equiv=["']content-security-policy["'])[^>]*>/gi, "")
    .replace(/<head\b[^>]*>/i, (head) => {
      const viewport = /<meta\b[^>]*name=["']viewport["']/i.test(html)
        ? ""
        : '<meta name="viewport" content="width=device-width, initial-scale=1">';
      return `${head}${viewport}${INQUIRY_CSP}`;
    });
  if (/<script\b[^>]*\bsrc\s*=|<iframe\b|<object\b|<embed\b|<form\b[^>]*\baction\s*=|javascript\s*:/i.test(html) ||
      /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|eval)\s*\(/i.test(html)) {
    throw new Error(`${role} returned active external-code, network, or unsafe navigation behavior; output was rejected.`);
  }
  if (!/<meta\b[^>]*http-equiv=["']content-security-policy["']/i.test(html) ||
      !/connect-src\s+['"]?none/i.test(html)) {
    throw new Error(`${role} output must include a restrictive Content Security Policy with connect-src none.`);
  }
  return html;
}

function checkHtml(role: "Storefront" | "Admin dashboard", html: string): Array<{ name: string; passed: boolean; evidence: string }> {
  const inlineScripts = Array.from(html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi));
  let scriptsParse = true;
  for (const [, attributes, source] of inlineScripts) {
    try {
      if (/type=["']application\/(?:ld\+)?json["']/i.test(attributes)) JSON.parse(source);
      else new Script(source, { filename: `${role.toLowerCase().replace(/\s+/g, "-")}.inline.js` });
    } catch {
      scriptsParse = false;
    }
  }
  const checks: Array<[string, boolean, string]> = [
    ["Complete HTML document", /^<!doctype html>/i.test(html) && /<\/html>/i.test(html), "DOCTYPE and closing HTML tag"],
    ["Responsive viewport", /name=["']viewport["']/i.test(html), "Viewport metadata"],
    ["Responsive layout rules", /@media\b/i.test(html), "CSS contains responsive media rules"],
    ["CSP blocks network requests", /connect-src\s+['"]?none/i.test(html), "Content Security Policy connect-src none"],
    ["No external script or network APIs", !/<script\b[^>]*\bsrc\s*=|<iframe\b|\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|eval)\s*\(/i.test(html), "No remote scripts, iframe, fetch, XHR, websocket, event stream, beacon or eval"],
    ["No external form submission", !/<form\b[^>]*\baction\s*=/i.test(html), "Forms have no network submission action"],
    ["No customer or payment data collection", !/<input\b[^>]*(?:type\s*=\s*["']?(?:email|tel|password|hidden)|(?:name|id|placeholder)\s*=\s*["'][^"']*(?:customer|email|phone|address|card|payment|password))|<textarea\b/i.test(html), "No fields collect customer contact, credentials, address or payment details"],
    ["Self-contained styling", !/<link\b[^>]*\brel=["']?stylesheet/i.test(html), "Styles are inline and do not depend on missing stylesheet files"],
    ["Inline JavaScript parses", scriptsParse, `${inlineScripts.length} inline script block(s) checked without execution`],
    ["No exposed credentials or contact details", !/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:api[_ -]?key|password|secret|token)\s*[:=]\s*\S+/i.test(html), "No email address or credential-like literal"],
  ];
  if (role === "Storefront") {
    const productCardCount = Array.from(html.matchAll(/<article\b/gi)).length;
    const samplePriceCount = Array.from(html.matchAll(/(?:PKR|Rs\.?)\s*[\d,.]+/gi)).length;
    checks.push(
      ["Product catalog", productCardCount >= 4 && samplePriceCount >= 4 && /sample|illustrative/i.test(html), "At least four article product cards with illustrative PKR prices"],
      ["Stitched and unstitched options", /stitched/i.test(html) && /unstitched/i.test(html), "Both garment purchase options are represented"],
      ["International 2x price disclosure", /international/i.test(html) && /(?:2\s*[x×]|twice|double)/i.test(html) && /stitching/i.test(html), "International clothing and stitching price multiplier is disclosed"],
      ["Local design image preview", /type=["']?file/i.test(html) && /FileReader/i.test(html), "Browser-local image file input and FileReader preview"],
      ["Requested delivery providers", ["TCS", "Leopards", "DHL", "UPS"].every((carrier) => new RegExp(carrier, "i").test(html)), "TCS, Leopards, DHL and UPS options"],
      ["Interactive cart", /\bcart\b|\bbag\b/i.test(html) && /addEventListener|onclick\s*=/i.test(html), "Cart/bag and browser interaction code"],
      ["Review area without invented testimonials", /review/i.test(html) && !/great product|loved the design|excellent customer service|highly recommend/i.test(html), "Review UI; common fabricated testimonial text is rejected"],
      ["Payment is not falsely represented as live", /demo|sample|prototype|not connected|not live|preview/i.test(html), "Checkout and payment are labelled as a prototype"],
      ["Local fashion imagery treatment", /<img\b|background(?:-image)?\s*:/i.test(html), "Product imagery elements or styled image placeholders"],
    );
  } else {
    checks.push(
      ["Order operations", /orders?/i.test(html), "Admin order management section"],
      ["Sales analytics", /sales/i.test(html) && /analytics|metric|report/i.test(html), "Admin sales and analytics section"],
      ["Delivery operations", /delivery|shipment/i.test(html) && /tracking|courier|dispatch/i.test(html), "Admin delivery/courier tracking section"],
      ["Product photo and video upload UI", /catalog|products/i.test(html) && /type=["']?file/i.test(html) && /video\//i.test(html), "Product media controls include video file support"],
      ["All requested delivery providers", ["TCS", "Leopards", "DHL", "UPS"].every((carrier) => new RegExp(carrier, "i").test(html)), "TCS, Leopards, DHL and UPS are represented"],
      ["Sample dashboard disclaimer", /sample|demo|prototype|illustrative/i.test(html), "Dashboard metrics/records are labelled illustrative"],
      ["No named customer or fabricated tracking records", !/Aisha Khan|Muhammad Ali|customerName\s*:|tracking id\s*#\s*[A-Z0-9-]{8,}/i.test(html), "Dashboard avoids realistic invented customer names and tracking references"],
    );
  }
  return checks.map(([name, passed, evidence]) => ({ name: `${role}: ${name}`, passed, evidence }));
}

async function askLocalAgent<T extends Record<string, unknown>>(input: {
  model: string;
  role: AgentRole;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maximumTokens: number;
}): Promise<T> {
  const endpoint = getLocalOllamaUrl();
  endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, "")}/api/chat`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300_000);
  try {
    let lastFailure: Error | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: input.model,
          stream: false,
          format: input.schema,
          keep_alive: "5m",
          options: {
            temperature: 0.5 + (attempt - 1) * 0.1,
            repeat_penalty: 1.15,
            num_ctx: 12288,
            num_predict: input.maximumTokens,
          },
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.prompt },
          ],
        }),
      });
      if (!response.ok) {
        const details = (await response.text()).replace(/\s+/g, " ").slice(0, 500);
        lastFailure = new Error(
          `${input.role} local Ollama request failed with HTTP ${response.status}${details ? `: ${details}` : "."}`
        );
        if (response.status < 500 || attempt === 3) throw lastFailure;
        console.warn(`${lastFailure.message} Retrying local role task (${attempt}/3).`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 800));
        continue;
      }
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !("message" in payload) ||
          !payload.message || typeof payload.message !== "object" || !("content" in payload.message) ||
          typeof payload.message.content !== "string") {
        throw new Error(`${input.role} received an invalid local Ollama response.`);
      }
      try {
        return parseJsonContent(payload.message.content) as T;
      } catch (error) {
        lastFailure = error instanceof Error ? error : new Error("Local agent returned malformed JSON.");
        if (attempt === 3) throw lastFailure;
        console.warn(`${input.role} returned malformed structured output. Retrying local role task (${attempt}/3).`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 800));
      }
    }
    throw lastFailure || new Error(`${input.role} failed after three local model attempts.`);
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`${input.role} local model request timed out after five minutes.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function saveJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

async function readBrief(path: string): Promise<string> {
  return readFile(path, "utf8");
}

function validateAgentBrief(role: string, value: unknown): string {
  if (typeof value !== "string" || value.trim().length < 300 ||
      /(?:python=\d|gcp-resource|tutorial-project-id|timestamp=20\d\d)/i.test(value)) {
    throw new Error(`${role} returned an incomplete or unrelated task brief; the downstream coding work was blocked.`);
  }
  return value.trim();
}

function remediationInstructions(blockers: string[]): string {
  return blockers.map((blocker) => {
    if (blocker.endsWith("Product catalog")) return "Create at least four real <article> product cards, each with a distinct product name and visible illustrative PKR price such as 'PKR 8,500'. Label the catalog prices illustrative/sample.";
    if (blocker.endsWith("No customer or payment data collection")) return "Remove all email, phone, password, address, payment, and free-text review input fields. This prototype must not collect personal or payment data.";
    if (blocker.endsWith("Self-contained styling")) return "Remove every stylesheet link and put the complete CSS inside a <style> element in this HTML document.";
    if (blocker.endsWith("Responsive layout rules")) return "Add real CSS @media rules that change the layout for mobile widths.";
    if (blocker.endsWith("Local design image preview")) return "Add an input type=file for an image and a FileReader load handler that displays a local preview.";
    if (blocker.endsWith("Requested delivery providers")) return "Include the literal carrier names TCS, Leopards, DHL, and UPS in the delivery choices.";
    if (blocker.endsWith("Interactive cart")) return "Add a cart/bag UI and a working addEventListener or onclick handler that updates quantity or total.";
    if (blocker.endsWith("Payment is not falsely represented as live")) return "State visibly that checkout/payment is demo-only and no payment or advance is connected.";
    if (blocker.endsWith("International 2x price disclosure")) return "Display the literal formula 'International product and stitching price = Pakistan base price × 2' and calculate both international product and stitching values as exactly twice the Pakistan price; any currency label must say illustrative, not live conversion.";
    if (blocker.endsWith("Delivery operations")) return "Add a section headed exactly 'Delivery and Shipment Tracking' with visible delivery, shipment, tracking, and courier labels.";
    if (blocker.endsWith("Product photo and video upload UI")) return "In the product catalog, add two file inputs: accept='image/*' and accept='video/*'. Files must remain local.";
    if (blocker.endsWith("Order operations")) return "Add a clearly labeled sample orders section.";
    if (blocker.endsWith("Sales analytics")) return "Add a sales section with analytics, metrics, or reports.";
    return `Implement the missing requirement explicitly in the HTML: ${blocker}.`;
  }).join("\n");
}

async function main(): Promise<void> {
  const model = process.env.OLLAMA_MODEL?.trim() || "llama3:latest";
  const coderModel = process.env.OLLAMA_CODER_MODEL?.trim() || model;
  const projectRoot = join(getWorkforceStorageRoot(), "projects", "DW-944529-ahlam-collections-preview");
  const runId = `agent-build-${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
  const runDirectory = join(projectRoot, "agent-generated-store", runId);
  const roleDirectory = join(runDirectory, "agent-outputs");
  await mkdir(roleDirectory, { recursive: true });

  const run: ProjectRun = {
    inquiryId: "DW-944529",
    project: "Ahlam Collections ecommerce store",
    runId,
    model,
    status: "running",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    prototypeDisclaimer: "Locally generated review prototype. Not a production backend; payment, courier booking, currency conversion, inventory and image persistence are unconnected.",
    tasks: [
      { id: "fashion-ux-designer", role: "Fashion UX Designer", status: "waiting" },
      { id: "ecommerce-architect", role: "Ecommerce Architect", status: "waiting" },
      { id: "storefront-coder", role: "Storefront Coder", status: "waiting" },
      { id: "admin-dashboard-coder", role: "Admin Dashboard Coder", status: "waiting" },
      { id: "qa-reviewer", role: "QA Reviewer", status: "waiting" },
    ],
    qa: { passed: 0, failed: 0, checks: [] },
  };
  const statePath = join(runDirectory, "agent-run.json");
  const latestPath = join(projectRoot, "latest-agent-run.json");
  const persist = async () => {
    run.updatedAt = new Date().toISOString();
    await saveJson(statePath, run);
    await saveJson(latestPath, { runId, status: run.status, path: runDirectory, updatedAt: run.updatedAt });
  };

  const execute = async <T extends Record<string, unknown>>(
    taskId: string,
    action: () => Promise<{ result: T; outputFile: string; summary: string }>,
    taskModel = model
  ): Promise<T> => {
    const task = run.tasks.find((candidate) => candidate.id === taskId);
    if (!task) throw new Error(`Unknown inquiry agent task: ${taskId}`);
    task.status = "running";
    task.model = taskModel;
    task.startedAt = new Date().toISOString();
    await persist();
    try {
      const { result, outputFile, summary } = await action();
      task.status = "completed";
      task.completedAt = new Date().toISOString();
      task.outputFile = outputFile;
      task.summary = summary;
      await persist();
      console.log(`${task.role}: TASK COMPLETED → ${outputFile}`);
      return result;
    } catch (error) {
      task.status = "failed";
      task.completedAt = new Date().toISOString();
      task.error = error instanceof Error ? error.message : "The local role task failed.";
      run.status = "failed";
      await persist();
      throw error;
    }
  };

  await persist();
  console.log(`Starting real local agent project run ${runId}; planning=${model}; coding=${coderModel}.`);
  try {
    const design = await execute("fashion-ux-designer", async () => {
      const result = await askLocalAgent<{ output: string }>({
        model,
        role: "Fashion UX Designer",
        system: "You are a local AI agency's fashion ecommerce UX designer. Work only from supplied scope. Return a detailed but concise design brief in Roman Urdu or English. Separate confirmed requirements from suggestions; no fictitious customer reviews. Do not claim to implement anything.",
        prompt: `${INQUIRY_SCOPE}\n\nCreate a clear visual direction, navigation and responsive interaction brief for the store and admin preview.`,
        schema: DESIGN_SCHEMA,
        maximumTokens: 1400,
      });
      const output = validateAgentBrief("Fashion UX Designer", result.output);
      const file = join(roleDirectory, "fashion-ux-designer.md");
      await writeFile(file, output, "utf8");
      return { result: { output }, outputFile: file, summary: output.slice(0, 400) };
    });

    const architecture = await execute("ecommerce-architect", async () => {
      const result = await askLocalAgent<{ output: string }>({
        model,
        role: "Ecommerce Architect",
        system: "You are a local ecommerce solution architect. Make a delivery plan with data entities, workflow, security and integration boundaries. Treat all scope as customer requirements, never as proof an integration exists. No credentials or external side effects.",
        prompt: `${INQUIRY_SCOPE}\n\nDesigner brief:\n${design.output}\n\nReturn an implementation architecture and acceptance checklist. Explicitly identify what is only a local prototype without backend services.`,
        schema: DESIGN_SCHEMA,
        maximumTokens: 1000,
      });
      const output = validateAgentBrief("Ecommerce Architect", result.output);
      const file = join(roleDirectory, "ecommerce-architect.md");
      await writeFile(file, output, "utf8");
      return { result: { output }, outputFile: file, summary: output.slice(0, 400) };
    });

    await execute("storefront-coder", async () => {
      let prompt = `${INQUIRY_SCOPE}\n\nDesign direction:\n${design.output}\n\nArchitecture and boundaries:\n${architecture.output}\n\nBuild a substantial, browser-interactive ecommerce storefront. Do not return an empty or text-only mockup. Make every required control work locally. Acceptance requirements: 1) create at least four distinct <article> product cards, each with a visible numeric PKR price; clearly label all catalog amounts illustrative/sample, not approved prices; 2) working stitched/unstitched selector and country selector; 3) display the exact formula 'International product and stitching price = Pakistan base price × 2' and calculate both product and stitching as exactly twice the Pakistan base, without claiming live exchange; 4) working add/remove cart and total calculation; 5) selectable TCS and Leopards within Pakistan and DHL and UPS internationally, clearly mock estimates; 6) design-reference image file upload preview implemented with FileReader and kept only in the current browser; 7) do not accept or send customer personal/payment data; checkout only displays a demo notice and explains that advance payments are not connected; 8) review section clearly states there are no verified reviews yet, with absolutely no fabricated customer testimonials; 9) clear local prototype disclaimers; 10) premium responsive editorial Pakistani fashion design with navigation and product search/filter, including real CSS @media rules; 11) use fashion image placeholders without external services except optional images.unsplash.com. Do not copy existing site assets or code. Use no external scripts or network APIs. Return one full working HTML document.`;
      let html = "";
      let blockers: string[] = [];
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const result = await askLocalAgent<{ html: string }>({
          model: coderModel,
          role: "Storefront Coder",
          system: "You are a senior frontend ecommerce coding agent. Implement every numbered acceptance requirement using semantic HTML, inline CSS and functional inline JavaScript. Keep the page self-contained. No external scripts, frameworks, network calls, remote form submissions, fake testimonials, or personal/payment data. The orchestrator enforces a restrictive no-network Content Security Policy. Return valid JSON containing only a complete HTML document under key html.",
          prompt,
          schema: CODE_SCHEMA,
          maximumTokens: 7200,
        });
        try {
          html = validateGeneratedHtml("Storefront Coder", result.html);
        } catch (error) {
          if (typeof result.html === "string") {
            await writeFile(join(roleDirectory, `storefront-coder-rejected-${attempt}.txt`), result.html.slice(0, 50000), "utf8");
          }
          blockers = [error instanceof Error ? error.message : "Unsafe or invalid HTML."];
          prompt += `\nThe previous attempt was rejected. Fix this blocking issue and regenerate the whole page: ${blockers.join("; ")}.`;
          continue;
        }
        const checks = checkHtml("Storefront", html);
        blockers = checks.filter((check) => !check.passed).map((check) => check.name);
        if (blockers.length === 0) break;
        await writeFile(join(roleDirectory, `storefront-coder-rejected-${attempt}.txt`), html, "utf8");
        prompt += `\nThe previous page failed these acceptance requirements: ${blockers.join("; ")}.\nExact repairs required:\n${remediationInstructions(blockers)}\nImplement these features as actual page controls, not just explanatory text, then regenerate the complete HTML.`;
      }
      if (blockers.length > 0) throw new Error(`Storefront coder failed required features after three attempts: ${blockers.join("; ")}.`);
      const file = join(runDirectory, "index.html");
      await writeFile(file, html, "utf8");
      run.qa.checks.push(...checkHtml("Storefront", html));
      return { result: { html }, outputFile: file, summary: `Generated ${html.length} characters of model-authored storefront HTML.` };
    }, coderModel);

    await execute("admin-dashboard-coder", async () => {
      let prompt = `${INQUIRY_SCOPE}\n\nDesign direction:\n${design.output}\n\nArchitect notes:\n${architecture.output}\n\nBuild a substantial, responsive admin dashboard review prototype. Acceptance requirements: 1) visually coherent premium fashion admin panel; 2) a Product Catalog section with BOTH an input type=file accept='image/*' and a separate input type=file accept='video/*'; files remain local and are not uploaded; 3) sample order list/status management; 4) sample sales dashboard and analytics; 5) a section headed exactly 'Delivery and Shipment Tracking' with visible delivery, shipment, tracking, and courier labels plus TCS, Leopards, DHL and UPS; never claim live APIs; 6) design-reference moderation/review area; 7) all data conspicuously labeled sample/mock, do not invent customer names or tracking numbers; use anonymous labels such as 'Sample order A'; 8) controls operate locally only and say no real changes persist; 9) no real login, payments, network calls or external scripts; 10) include viewport metadata and real CSS @media rules; 11) clear production-integration limitations. Return a complete standalone HTML page.`;
      let html = "";
      let blockers: string[] = [];
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const result = await askLocalAgent<{ html: string }>({
          model: coderModel,
          role: "Admin Dashboard Coder",
          system: "You are a senior frontend admin dashboard coding agent. Implement every numbered requirement as semantic, responsive HTML and working local-only interactions. No external scripts, frameworks, network calls, remote form submissions, or customer data. The orchestrator adds a restrictive no-network Content Security Policy. Return valid JSON containing only a complete HTML document under key html.",
          prompt,
          schema: CODE_SCHEMA,
          maximumTokens: 6500,
        });
        try {
          html = validateGeneratedHtml("Admin Dashboard Coder", result.html);
        } catch (error) {
          if (typeof result.html === "string") {
            await writeFile(join(roleDirectory, `admin-dashboard-coder-rejected-${attempt}.txt`), result.html.slice(0, 50000), "utf8");
          }
          blockers = [error instanceof Error ? error.message : "Unsafe or invalid HTML."];
          prompt += `\nThe previous attempt was rejected. Fix this blocking issue and regenerate the whole dashboard: ${blockers.join("; ")}.`;
          continue;
        }
        const checks = checkHtml("Admin dashboard", html);
        blockers = checks.filter((check) => !check.passed).map((check) => check.name);
        if (blockers.length === 0) break;
        await writeFile(join(roleDirectory, `admin-dashboard-coder-rejected-${attempt}.txt`), html, "utf8");
        prompt += `\nThe previous dashboard failed these acceptance requirements: ${blockers.join("; ")}.\nExact repairs required:\n${remediationInstructions(blockers)}\nImplement every missing section/control in the page and regenerate complete HTML.`;
      }
      if (blockers.length > 0) throw new Error(`Admin dashboard coder failed required features after three attempts: ${blockers.join("; ")}.`);
      const file = join(runDirectory, "admin.html");
      await writeFile(file, html, "utf8");
      run.qa.checks.push(...checkHtml("Admin dashboard", html));
      return { result: { html }, outputFile: file, summary: `Generated ${html.length} characters of model-authored admin dashboard HTML.` };
    }, coderModel);

    await execute("qa-reviewer", async () => {
      const [storeHtml, adminHtml] = await Promise.all([
        readBrief(join(runDirectory, "index.html")),
        readBrief(join(runDirectory, "admin.html")),
      ]);
      const deterministic = run.qa.checks;
      const qa = await askLocalAgent<{ summary: string; blockingIssues: string[]; followUps: string[] }>({
        model,
        role: "QA Reviewer",
        system: "You are a defensive frontend QA reviewer. Review only the supplied generated frontend. Identify concrete omissions from requirements and whether unsafe external requests, fake integrations or false live-sales claims are present. Return JSON with summary, blockingIssues array, followUps array. Be concise and do not claim browser tests were run.",
        prompt: `${INQUIRY_SCOPE}\n\nGenerated storefront HTML (first 20,000 characters):\n${storeHtml.slice(0, 20000)}\n\nGenerated admin HTML (first 16,000 characters):\n${adminHtml.slice(0, 16000)}\n\nDeterministic checks:\n${JSON.stringify(deterministic, null, 2)}\n\nReport code-inspection findings only.`,
        schema: QA_SCHEMA,
        maximumTokens: 1100,
      });
      if (typeof qa.summary !== "string" || !Array.isArray(qa.blockingIssues) || !Array.isArray(qa.followUps)) {
        throw new Error("QA Reviewer returned an invalid review.");
      }
      const file = join(roleDirectory, "qa-review.json");
      await saveJson(file, { ...qa, method: "local model code inspection plus deterministic source checks; no browser test claimed", deterministic });
      run.qa.checks.push(...qa.blockingIssues.map((issue, index) => ({
        name: `QA Reviewer blocker ${index + 1}`,
        passed: false,
        evidence: issue,
      })));
      run.qa.passed = run.qa.checks.filter((check) => check.passed).length;
      run.qa.failed = run.qa.checks.filter((check) => !check.passed).length;
      if (run.qa.failed > 0) {
        const modelBlockers = qa.blockingIssues.length > 0 ? `; QA Reviewer: ${qa.blockingIssues.join("; ")}` : "";
        throw new Error(`Generated site failed ${run.qa.failed} QA checks${modelBlockers}.`);
      }
      return {
        result: qa,
        outputFile: file,
        summary: `QA reviewed both generated files; ${run.qa.passed} deterministic checks passed with no model-reported blockers.`,
      };
    });
    run.status = "completed";
    await writeFile(join(runDirectory, "README.txt"), [
      "AI workforce-generated local review prototype",
      `Inquiry: ${run.inquiryId}`,
      `Agent run: ${runId}`,
      `Model: ${model}`,
      "",
      run.prototypeDisclaimer,
      "",
      "Preview server (start in this folder): python -m http.server 3002 --bind 127.0.0.1",
      "Storefront: http://localhost:3002/",
      "Admin visual preview: http://localhost:3002/admin.html",
      "",
      "Only use these artifacts for local review. This run does not implement a production backend, payments, shipping carrier APIs, live FX, customer storage, or deployment.",
    ].join("\n"), "utf8");
    await persist();
    console.log(`AGENT BUILD COMPLETED: ${runDirectory}`);
    console.log(`Preview: python -m http.server 3002 --bind 127.0.0.1 --directory "${runDirectory}"`);
  } catch (error) {
    run.status = "failed";
    await persist();
    console.error(error instanceof Error ? error.message : "Inquiry agent pipeline failed.");
    process.exitCode = 1;
  }
}

export { checkHtml, validateGeneratedHtml };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
