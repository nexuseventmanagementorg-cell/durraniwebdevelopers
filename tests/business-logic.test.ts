import assert from "node:assert/strict";
import test from "node:test";
import { calculateBudget, DEFAULT_PRICING_CONFIG, buildWhatsAppLink } from "../src/lib/constants";
import { signToken, verifyToken, verifyAdminCredentials } from "../src/lib/auth";
import { checkRateLimit } from "../src/lib/rateLimit";
import { DataStore } from "../src/lib/store";

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
