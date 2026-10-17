import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { hasPaymentSupabaseConfiguration, getPaymentSupabase } from "@/lib/payment-server";

const PASSWORD_HASH_BYTES = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

export class AdminCredentialStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminCredentialStoreError";
  }
}

function derivePasswordHash(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      PASSWORD_HASH_BYTES,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      }
    );
  });
}

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derivePasswordHash(password, salt);
  return `scrypt$${SCRYPT_COST}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyAdminPasswordHash(
  password: string,
  encodedHash: string
): Promise<boolean> {
  const [algorithm, costText, saltText, hashText] = encodedHash.split("$");
  const cost = Number(costText);
  if (
    algorithm !== "scrypt" ||
    cost !== SCRYPT_COST ||
    !saltText ||
    !hashText
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(hashText, "base64url");
    if (salt.length !== 16 || expected.length !== PASSWORD_HASH_BYTES) return false;
    const actual = await derivePasswordHash(password, salt);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

async function readStoredPasswordHash(): Promise<string | null> {
  if (!hasPaymentSupabaseConfiguration()) return null;

  const { data, error } = await getPaymentSupabase()
    .from("admin_credentials")
    .select("password_hash")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (code === "42P01" || code === "PGRST205") {
      throw new AdminCredentialStoreError(
        "Admin credential storage is not installed. Apply supabase/admin-credentials.sql."
      );
    }
    throw new AdminCredentialStoreError(
      "Could not check the saved admin password in Supabase."
    );
  }

  return typeof data?.password_hash === "string" ? data.password_hash : null;
}

export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const configuredUsername = process.env.ADMIN_USERNAME;
  if (!configuredUsername) {
    throw new AdminCredentialStoreError(
      "Admin login is not configured. Set ADMIN_USERNAME in .env.local and restart the server."
    );
  }
  if (username.trim().toLowerCase() !== configuredUsername.trim().toLowerCase()) {
    return false;
  }

  const storedHash = await readStoredPasswordHash();
  if (storedHash) return verifyAdminPasswordHash(password, storedHash);

  const bootstrapPassword = process.env.ADMIN_PASSWORD;
  if (!bootstrapPassword) {
    throw new AdminCredentialStoreError(
      "Admin password is not configured. Set ADMIN_PASSWORD in .env.local or save a password in Supabase."
    );
  }
  return password === bootstrapPassword;
}

export async function saveAdminPassword(password: string): Promise<void> {
  if (!hasPaymentSupabaseConfiguration()) {
    throw new AdminCredentialStoreError(
      "Password changes require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const passwordHash = await hashAdminPassword(password);
  const { error } = await getPaymentSupabase()
    .from("admin_credentials")
    .upsert(
      { id: 1, password_hash: passwordHash, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (code === "42P01" || code === "PGRST205") {
      throw new AdminCredentialStoreError(
        "Admin credential storage is not installed. Apply supabase/admin-credentials.sql."
      );
    }
    throw new AdminCredentialStoreError(
      "Could not save the new admin password in Supabase."
    );
  }
}
