import assert from "node:assert/strict";
import test from "node:test";
import { checkHtml, validateGeneratedHtml } from "../scripts/workforce-inquiry-agent";

const safeHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; img-src 'self' data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'"><style>@media(max-width:600px){main{width:100%}}</style></head><body><main><section><h1>Product catalog</h1><p>Unstitched and stitched, international product and stitching prices 2x illustrative. TCS Leopards DHL UPS. Cart checkout preview, no verified reviews yet, demo payment.</p><article>Sample product one PKR 8500</article><article>Sample product two PKR 9200</article><article>Sample product three PKR 7600</article><article>Sample product four PKR 10500</article><img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="><input type="file"><button id="cart">Add to cart</button>${"Store preview ".repeat(120)}</section></main><script>document.body.dataset.ready="true"; const imageReader = new FileReader(); document.getElementById("cart")?.addEventListener("click", () => {});</script></body></html>`;

test("inquiry coding agent accepts a bounded self-contained CSP-protected HTML artifact", () => {
  const validated = validateGeneratedHtml("coder", safeHtml);
  assert.match(validated, /^<!doctype html>/i);
  assert.match(validated, /connect-src 'none'/i);
  assert.equal(checkHtml("Storefront", safeHtml).every((check) => check.passed), true);

  const missingImagePreview = checkHtml("Storefront", safeHtml.replace("FileReader", "BlobReader"));
  assert.ok(missingImagePreview.some((check) => check.name.endsWith("Local design image preview") && !check.passed));
});

test("inquiry coding agent rejects external execution and network-capable HTML", () => {
  assert.throws(() => validateGeneratedHtml("coder", safeHtml.replace("</body>", "<script src=\"https://example.test/x.js\"></script></body>")), /unsafe navigation behavior/);
  assert.throws(() => validateGeneratedHtml("coder", safeHtml.replace("</body>", "<script>fetch('https://example.test')</script></body>")), /unsafe navigation behavior/);
  assert.ok(checkHtml("Storefront", safeHtml.replace("</body>", "<input type=\"email\" name=\"customerEmail\"></body>"))
    .some((check) => check.name.endsWith("No customer or payment data collection") && !check.passed));
  assert.ok(checkHtml("Storefront", safeHtml.replace("</head>", "<link rel=\"stylesheet\" href=\"missing.css\"></head>"))
    .some((check) => check.name.endsWith("Self-contained styling") && !check.passed));
});

test("inquiry coding agent enforces the restrictive no-network CSP on model output", () => {
  const noPolicy = safeHtml.replace(/<meta http-equiv="Content-Security-Policy"[^>]+>/, "");
  const validated = validateGeneratedHtml("coder", noPolicy);
  assert.match(validated, /connect-src 'none'/i);
});
