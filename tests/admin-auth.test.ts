import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST as login } from "../src/app/api/admin/login/route";
import { POST as logout } from "../src/app/api/admin/logout/route";
import { GET as getAdminStats } from "../src/app/api/admin/stats/route";
import { getAdminFromRequest, signToken, verifyAdminRequest, verifyToken } from "../src/lib/auth";

const SESSION_SECRET = "isolated-admin-auth-test-secret-at-least-32-characters";
let requestCounter = 0;

async function withEnvironment(
  values: Record<string, string | undefined>,
  run: () => Promise<void>
): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    await run();
  } finally {
    previous.forEach((value, key) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
}

function createLoginRequest(
  body: string
): NextRequest {
  requestCounter += 1;
  return new NextRequest("http://localhost/api/admin/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `198.51.100.${requestCounter}`,
    },
    body,
  });
}

test("admin login accepts isolated credentials and issues a persistent secure session", async () => {
  await withEnvironment(
    {
      ADMIN_USERNAME: "test-admin",
      ADMIN_PASSWORD: "test-password-exact",
      SESSION_SECRET,
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      const response = await login(
        createLoginRequest(JSON.stringify({ username: " TEST-ADMIN ", password: "test-password-exact" }))
      );
      assert.equal(response.status, 200);
      assert.equal((await response.json()).success, true);

      const cookie = response.headers.get("set-cookie");
      assert.ok(cookie?.includes("dwd_admin_session="));
      assert.ok(cookie?.includes("HttpOnly"));
      assert.ok(cookie?.includes("SameSite=lax"));
      assert.ok(cookie?.includes("Secure"));

      const token = cookie?.match(/dwd_admin_session=([^;]+)/)?.[1];
      assert.ok(token);
      const firstRequest = new NextRequest("http://localhost/api/admin/stats", {
        headers: { cookie: `dwd_admin_session=${token}` },
      });
      const refreshedRequest = new NextRequest("http://localhost/api/admin/stats", {
        headers: { cookie: `dwd_admin_session=${token}` },
      });

      assert.equal(verifyAdminRequest(firstRequest), true);
      assert.equal(verifyAdminRequest(refreshedRequest), true);
      assert.equal(getAdminFromRequest(firstRequest)?.email, " TEST-ADMIN ");
    }
  );
});

test("admin login rejects incorrect credentials and malformed or incomplete requests", async () => {
  await withEnvironment(
    {
      ADMIN_USERNAME: "test-admin",
      ADMIN_PASSWORD: "test-password-exact",
      SESSION_SECRET,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      const incorrectUsername = await login(
        createLoginRequest(JSON.stringify({ username: "other-admin", password: "test-password-exact" }))
      );
      assert.equal(incorrectUsername.status, 401);

      const incorrectPassword = await login(
        createLoginRequest(JSON.stringify({ username: "test-admin", password: "wrong-password" }))
      );
      assert.equal(incorrectPassword.status, 401);

      const missingUsername = await login(
        createLoginRequest(JSON.stringify({ password: "test-password-exact" }))
      );
      assert.equal(missingUsername.status, 400);

      const missingPassword = await login(
        createLoginRequest(JSON.stringify({ username: "test-admin" }))
      );
      assert.equal(missingPassword.status, 400);

      const emptyCredentials = await login(
        createLoginRequest(JSON.stringify({ username: "", password: "" }))
      );
      assert.equal(emptyCredentials.status, 400);

      const malformedJson = await login(createLoginRequest("{invalid"));
      assert.equal(malformedJson.status, 400);

      const nonObjectJson = await login(createLoginRequest("[]"));
      assert.equal(nonObjectJson.status, 400);
    }
  );
});

test("admin login fails safely when server credential configuration is missing", async () => {
  await withEnvironment(
    {
      ADMIN_USERNAME: undefined,
      ADMIN_PASSWORD: undefined,
      SESSION_SECRET,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      const response = await login(
        createLoginRequest(JSON.stringify({ username: "test-admin", password: "test-password-exact" }))
      );
      assert.equal(response.status, 503);
      assert.equal((await response.json()).success, false);
    }
  );
});

test("sessions reject invalid and expired tokens, and logout clears the session cookie", async () => {
  await withEnvironment({ SESSION_SECRET }, async () => {
    const validToken = signToken({ email: "test-admin", timestamp: Date.now() });
    const expiredToken = signToken({
      email: "test-admin",
      timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
    });

    assert.ok(verifyToken(validToken));
    assert.equal(verifyToken("invalid.token"), null);
    assert.equal(verifyToken(expiredToken), null);

    const protectedResponse = await getAdminStats(
      new NextRequest("http://localhost/api/admin/stats")
    );
    assert.equal(protectedResponse.status, 401);

    const logoutResponse = await logout();
    assert.equal(logoutResponse.status, 200);
    assert.ok(logoutResponse.headers.get("set-cookie")?.includes("Max-Age=0"));
    assert.equal(verifyAdminRequest(new NextRequest("http://localhost/api/admin/stats")), false);
  });
});
