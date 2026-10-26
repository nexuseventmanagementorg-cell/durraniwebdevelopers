import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'crypto';
import {
  getStoredAdminCredentials,
  updateStoredAdminCredentials,
} from '@/lib/db';
import type { StoredAdminCredentials } from '@/lib/db';

const PASSWORD_HASH_BYTES = 64;

function derivePasswordHash(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, PASSWORD_HASH_BYTES, (error, derivedKey) => {
      if (error) {
        reject(error);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

function passwordsMatch(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}

async function storedPasswordMatches(
  password: string,
  credentials: StoredAdminCredentials
): Promise<boolean> {
  if (password.length > 128) return false;
  const salt = Buffer.from(credentials.salt, 'base64url');
  const expectedHash = Buffer.from(credentials.passwordHash, 'base64url');
  if (!salt.length || expectedHash.length !== PASSWORD_HASH_BYTES) return false;

  const actualHash = await derivePasswordHash(password, salt);
  return timingSafeEqual(actualHash, expectedHash);
}

export function getCurrentAdminUsername(): string | null {
  return getStoredAdminCredentials()?.username ?? process.env.ADMIN_USERNAME ?? null;
}

export async function verifyAdminLogin(username: string, password: string): Promise<boolean> {
  const storedCredentials = getStoredAdminCredentials();
  if (storedCredentials) {
    return (
      storedCredentials.username === username &&
      (await storedPasswordMatches(password, storedCredentials))
    );
  }

  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_SECRET_KEY;
  return Boolean(
    expectedUsername &&
      expectedPassword &&
      username === expectedUsername &&
      passwordsMatch(password, expectedPassword)
  );
}

export async function verifyCurrentAdminPassword(password: string): Promise<boolean> {
  const storedCredentials = getStoredAdminCredentials();
  if (storedCredentials) return storedPasswordMatches(password, storedCredentials);

  const expectedPassword = process.env.ADMIN_SECRET_KEY;
  return Boolean(expectedPassword && passwordsMatch(password, expectedPassword));
}

export async function saveAdminCredentials(username: string, password: string): Promise<void> {
  const salt = randomBytes(16);
  const passwordHash = await derivePasswordHash(password, salt);
  updateStoredAdminCredentials({
    username,
    salt: salt.toString('base64url'),
    passwordHash: passwordHash.toString('base64url'),
    sessionVersion: randomUUID(),
  });
}
