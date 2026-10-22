import { timingSafeEqual } from "crypto";

export type CronAuthorizationResult<T> =
  | { authorized: false }
  | { authorized: true; value: T };

export async function runWithCronAuthorization<T>(
  authorizationHeader: string | null,
  configuredSecret: string | undefined,
  operation: () => Promise<T>
): Promise<CronAuthorizationResult<T>> {
  const secret = configuredSecret?.trim();
  const header = authorizationHeader?.trim() || "";
  const bearerMatch = /^Bearer\s+(.+)$/i.exec(header);

  if (!secret || !bearerMatch) return { authorized: false };

  const expected = Buffer.from(secret, "utf8");
  const provided = Buffer.from(bearerMatch[1], "utf8");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { authorized: false };
  }

  return { authorized: true, value: await operation() };
}