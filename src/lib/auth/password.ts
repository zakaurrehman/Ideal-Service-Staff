/**
 * Password hashing — Argon2id with the OWASP-recommended baseline
 * (19 MiB memory, 2 iterations, 1 lane). Hashes are self-describing PHC
 * strings, so parameters can be raised later without breaking old hashes.
 */
import { hash, verify } from "@node-rs/argon2";

const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export function hashPassword(password: string) {
  return hash(password, OPTIONS); // @node-rs/argon2 defaults to Argon2id
}

/** A real hash of a random value — used to equalise timing when an account doesn't exist. */
let dummy: Promise<string> | undefined;
export async function verifyPassword(passwordHash: string | null | undefined, password: string) {
  if (!passwordHash) {
    dummy ??= hashPassword("timing-equaliser-" + Math.random());
    await verify(await dummy, password).catch(() => false);
    return false;
  }
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

const COMMON = new Set([
  "password", "password1", "password12", "password123", "password1234", "123456789", "1234567890", "qwertyuiop",
  "iloveyou12", "letmein123", "welcome123", "admin12345", "changeme123", "football12", "sunshine12", "princess12",
  "abc1234567", "qwerty1234", "1q2w3e4r5t", "baseball12", "superman12", "trustno1234",
]);

/** Returns an error message, or null when the password is acceptable. */
export function passwordProblem(password: string, context: { email?: string; name?: string } = {}): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "This password is too common. Choose something less predictable.";
  if (/^(.)\1+$/.test(password)) return "Avoid repeating a single character.";
  const local = context.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return "Don’t include your email address in your password.";
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (password.length < 14 && classes < 3) return "Mix upper- and lower-case letters, numbers or symbols — or use a longer passphrase (14+ characters).";
  return null;
}
