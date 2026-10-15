import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "crypto";
import { calculateBudget, DEFAULT_PRICING_CONFIG, BUSINESS_INFO, buildWhatsAppLink } from "../src/lib/constants";
import { signToken, verifyToken } from "../src/lib/auth";
import {
  hashAdminPassword,
  verifyAdminPasswordHash,
} from "../src/lib/admin-credentials";
import { checkRateLimit } from "../src/lib/rateLimit";
import { DataStore } from "../src/lib/store";
import { detectWebsiteFeatures, estimateWebsite } from "../src/lib/website-estimator";
import { currencyForCountry, getRegionalPricingConfig } from "../src/lib/currency";
import {
  describePaymentBackendError,
  getPublicPaymentOptions,
  PaymentConfigurationError,
  validatePaymentSettings,
} from "../src/lib/payment-server";
import { DEFAULT_PAYMENT_SETTINGS } from "../src/lib/payment-types";
import {
  isSafepayCurrency,
  toSafepayMinorUnits,
  verifySafepayWebhookSignature,
} from "../src/lib/safepay";

test("Package 1: Web App Without Client Admin Panel (PKR 35,000)", () => {
  const calc = calculateBudget("none", []);

  assert.equal(calc.basePrice, 35000, "Base price without admin must be 35,000");
  assert.equal(calc.adminFee, 0, "Admin fee for managed tier must be 0");
  assert.equal(calc.addonsTotal, 0, "No addons selected");
  assert.equal(calc.estimatedTotal, 35000, "Total must be 35,000");
  assert.equal(calc.advanceAmount, 10000, "Default advance must be 10,000");
  assert.equal(calc.remainingBalance, 25000, "Remaining balance must be 25,000");

  assert.equal(calc.installmentsCount, 11, "Must have 11 installments");
  assert.equal(calc.regularInstallment, 2272.73, "Regular installment must be 2,272.73");
  assert.equal(calc.finalInstallment, 2272.70, "Final installment must be adjusted to 2,272.70");

  // Exact penny reconciliation
  const sum = Number((calc.regularInstallment * 10 + calc.finalInstallment).toFixed(2));
  assert.equal(sum, 25000.0, "Sum of 10 installments + final installment must equal 25,000 exactly");

  // Daily cost verification (35,000 / 365 = ~95.89)
  assert.equal(calc.dailyCost, 95.89, "Daily cost must be 95.89");
});

test("Package 2: Web App With Client Admin Panel Support (PKR 45,000)", () => {
  const calc = calculateBudget("client_admin", []);

  assert.equal(calc.basePrice, 45000, "Base price with admin must be 45,000");
  assert.equal(calc.adminFee, 10000, "Admin fee difference must be 10,000");
  assert.equal(calc.estimatedTotal, 45000, "Total must be 45,000");
  assert.equal(calc.advanceAmount, 10000, "Advance must be 10,000");
  assert.equal(calc.remainingBalance, 35000, "Remaining balance must be 35,000");

  assert.equal(calc.installmentsCount, 11, "Must have 11 installments");
  assert.equal(calc.regularInstallment, 3181.82, "Regular installment must be 3,181.82");
  assert.equal(calc.finalInstallment, 3181.80, "Final installment must be adjusted to 3,181.80");

  // Exact penny reconciliation
  const sum = Number((calc.regularInstallment * 10 + calc.finalInstallment).toFixed(2));
  assert.equal(sum, 35000.0, "Sum of 10 installments + final installment must equal 35,000 exactly");

  // Daily cost verification (45,000 / 365 = ~123.29)
  assert.equal(calc.dailyCost, 123.29, "Daily cost must be 123.29");
});

test("Addon selection and deduplication protects against double charges", () => {
  // Pass duplicates of google_auth and supabase_db
  const calc = calculateBudget("client_admin", [
    "google_auth",
    "google_auth",
    "supabase_db",
    "google_auth",
  ]);

  assert.equal(calc.selectedAddonDetails.length, 2, "Only 2 unique addons should be counted");
  assert.equal(calc.addonsTotal, 20000, "2 addons at 10,000 each = 20,000");
  assert.equal(calc.estimatedTotal, 45000 + 20000, "45k base + 20k addons = 65,000");
  assert.equal(calc.advanceAmount, 10000, "Advance is 10,000");
  assert.equal(calc.remainingBalance, 55000, "Remaining balance is 55,000");

  const sum = Number((calc.regularInstallment * 10 + calc.finalInstallment).toFixed(2));
  assert.equal(sum, 55000.0, "Sum of installments must equal 55,000.00 exactly");
});

test("WhatsApp link formatting with country code 92 and no leading zero", () => {
  const link = buildWhatsAppLink("Hello Durrani Web Developers");
  assert.equal(BUSINESS_INFO.phone, "+923299669565");
  assert.equal(BUSINESS_INFO.phoneDisplay, "+923299669565");
  assert.match(link, /^https:\/\/wa\.me\/923299669565\?text=/, "Must use 923299669565 without leading zero");
  assert.ok(link.includes("Hello%20Durrani%20Web%20Developers"), "Must properly url-encode message text");
});

test("Admin Token Signing and Tamper Prevention", () => {
  const email = "admin@durraniwebdevelopers.com";
  const token = signToken({ email, timestamp: Date.now() });

  const verified = verifyToken(token);
  assert.ok(verified, "Valid token must be verified");
  assert.equal(verified?.email, email);

  // Tampered signature
  const parts = token.split(".");
  const tamperedToken = `${parts[0]}.0000000000000000000000000000000000000000000000000000000000000000`;
  assert.equal(verifyToken(tamperedToken), null, "Tampered token must be rejected");
});

test("Admin password hashes are salted and verified without storing plaintext", async () => {
  const password = "long-test-password-value";
  const firstHash = await hashAdminPassword(password);
  const secondHash = await hashAdminPassword(password);

  assert.notEqual(firstHash, secondHash, "Each password hash must use a random salt");
  assert.equal(await verifyAdminPasswordHash(password, firstHash), true);
  assert.equal(await verifyAdminPasswordHash("incorrect-password", firstHash), false);
  assert.equal(firstHash.includes(password), false);
});

test("Rate limiter threshold enforcement", () => {
  const testKey = `test_rate_limit_${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    const res = checkRateLimit(testKey, 5, 10000);
    assert.ok(res.allowed, `Request ${i + 1} should be allowed`);
  }

  // 6th request exceeds limit
  const exceedRes = checkRateLimit(testKey, 5, 10000);
  assert.equal(exceedRes.allowed, false, "6th request exceeding limit of 5 must be blocked");
});

test("DataStore Ledger Calculations & Isolation", () => {
  const portfolio = DataStore.getPortfolio(false);
  assert.ok(portfolio.length > 0, "Public portfolio must have items");
  assert.ok(portfolio.every((p) => p.isPublic === true), "All items returned by public portfolio must be public");

  const pricingConfig = DataStore.getPricingConfig();
  assert.equal(pricingConfig.baseWithoutAdmin, 35000);
  assert.equal(pricingConfig.baseWithAdmin, 45000);
});

test("Website estimator maps visible store and admin signals to calculator pricing", () => {
  const detected = detectWebsiteFeatures(
    "Restaurant menu, add to cart, online ordering, staff admin dashboard"
  );

  assert.equal(detected.adminPanel, true);
  assert.ok(detected.addonIds.includes("supabase_db"));
  assert.equal(detected.features.some((feature) => feature.title === "Online order aur cart"), true);
  assert.equal(detected.features.some((feature) => feature.title === "Product ya menu catalog"), true);
  const manualPaymentSignals = detectWebsiteFeatures(
    "Accepted payments: Easypaisa, JazzCash, Cash on Delivery"
  );
  assert.equal(manualPaymentSignals.addonIds.includes("payment_gateway"), false);
});

test("Website estimator rejects local URLs before making a request", async () => {
  await assert.rejects(
    estimateWebsite("http://localhost/"),
    /public website|URL|address|host|local|private/i
  );
});

test("Website estimator rejects non-HTTP URL schemes", async () => {
  await assert.rejects(
    estimateWebsite("file:///etc/passwd"),
    /HTTP|HTTPS|URL/i
  );
});

test("International pricing doubles PKR rates before converting to the selected currency", () => {
  const regionalConfig = getRegionalPricingConfig(DEFAULT_PRICING_CONFIG, "EUR", {
    PKR: 1,
    EUR: 0.003,
  });

  assert.equal(regionalConfig.baseWithoutAdmin, 210);
  assert.equal(regionalConfig.baseWithAdmin, 270);
  assert.equal(regionalConfig.addons.supabase_db.price, 100);
  assert.equal(regionalConfig.addons.google_auth.price, 100);
  assert.equal(regionalConfig.advanceDefault, 60);
  const calculatorTotal = calculateBudget(
    "none",
    ["supabase_db"],
    regionalConfig
  );
  assert.equal(calculatorTotal.estimatedTotal, 310);
});

test("Regional currency maps Germany, UK, Canada, US, Australia, and other European regions", () => {
  assert.equal(currencyForCountry(null), "PKR");
  assert.equal(currencyForCountry(undefined), "PKR");
  assert.equal(currencyForCountry("DE"), "EUR");
  assert.equal(currencyForCountry("GB"), "GBP");
  assert.equal(currencyForCountry("US"), "USD");
  assert.equal(currencyForCountry("CA"), "CAD");
  assert.equal(currencyForCountry("AU"), "AUD");
  assert.equal(currencyForCountry("NO"), "NOK");
  assert.equal(currencyForCountry("PL"), "PLN");
  assert.equal(currencyForCountry("XX"), "USD");
});

test("Safepay checkout accepts supported quote currencies and converts amounts to minor units", () => {
  assert.equal(isSafepayCurrency("PKR"), true);
  assert.equal(isSafepayCurrency("EUR"), true);
  assert.equal(isSafepayCurrency("INR"), false);
  assert.equal(toSafepayMinorUnits("123.45", "USD"), 12345);
  assert.equal(toSafepayMinorUnits("4000", "PKR"), 400000);
  assert.throws(() => toSafepayMinorUnits("1.001", "EUR"), /decimal places/i);
  assert.throws(() => toSafepayMinorUnits("0", "PKR"), /valid payment amount/i);
});

test("Safepay webhook signature checks signed payloads and rejects modified or malformed events", () => {
  const payload = {
    type: "payment.succeeded",
    data: { tracker: "track_test", amount: 10000, currency: "PKR" },
  };
  const secret = "test-webhook-secret";
  const signature = createHmac("sha512", secret)
    .update(Buffer.from(JSON.stringify(payload)))
    .digest("hex");

  assert.equal(verifySafepayWebhookSignature(payload, signature, secret), true);
  assert.equal(
    verifySafepayWebhookSignature({ ...payload, type: "payment.failed" }, signature, secret),
    false
  );
  assert.equal(verifySafepayWebhookSignature(payload, "bad-signature", secret), false);
  assert.equal(verifySafepayWebhookSignature(payload, signature, ""), false);
});

test("Manual payment instructions only expose complete Pakistan methods", () => {
  const settings = {
    ...DEFAULT_PAYMENT_SETTINGS,
    accountHolder: "Test Recipient",
    walletNumber: "03000000000",
    bankName: "Test Bank",
    accountNumber: "000000000000",
  };

  assert.equal(validatePaymentSettings(settings), true);
  assert.equal(validatePaymentSettings({ ...settings, bankTransferEnabled: "yes" }), false);

  const pakistanOptions = getPublicPaymentOptions(settings, true);
  assert.equal(pakistanOptions.methods.JazzCash, true);
  assert.equal(pakistanOptions.methods.Easypaisa, true);
  assert.equal(pakistanOptions.methods["Bank Transfer"], true);
  assert.equal(pakistanOptions.cardCheckoutAvailable, false);

  const internationalOptions = getPublicPaymentOptions(settings, false);
  assert.equal(internationalOptions.methods.JazzCash, false);
  assert.equal(internationalOptions.methods["Bank Transfer"], false);
  assert.equal(internationalOptions.accountNumber, "");
  assert.equal(internationalOptions.walletNumber, "");
});

test("Payment backend errors distinguish missing configuration, missing schema, and Storage", () => {
  assert.match(
    describePaymentBackendError(new PaymentConfigurationError(), "database"),
    /NEXT_PUBLIC_SUPABASE_URL/
  );
  assert.match(
    describePaymentBackendError({ code: "PGRST205" }, "database"),
    /payment-workflow\.sql/
  );
  assert.match(
    describePaymentBackendError({ code: "NoSuchBucket" }, "storage"),
    /payment-receipts/
  );
});
