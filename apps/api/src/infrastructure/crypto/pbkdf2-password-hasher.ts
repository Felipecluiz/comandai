import type { PasswordHasher } from "../../application";

const ITERATIONS = 100_000; // limite suportado pelo WebCrypto dos Workers
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;

const encoder = new TextEncoder();
const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

async function derive(password: string, salt: BufferSource, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    KEY_LENGTH_BITS,
  );
  return new Uint8Array(bits);
}

/** Comparação em tempo constante: não vaza, pelo tempo de resposta, quantos bytes bateram. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  a.forEach((byte, i) => (diff |= byte ^ (b[i] ?? 0)));
  return diff === 0;
}

/** Formato: pbkdf2$<iterações>$<salt b64>$<hash b64> — permite aumentar iterações no futuro. */
export class Pbkdf2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const hash = await derive(password, salt, ITERATIONS);
    return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [scheme, iterations, salt, hash] = stored.split("$");
    if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;
    const candidate = await derive(password, fromBase64(salt), Number(iterations));
    return timingSafeEqual(candidate, fromBase64(hash));
  }
}
