/**
 * Hash SHA-256 hex d’un code foyer (ADR 0016).
 * Même formule que `encode(digest(upper(trim(code)), 'sha256'), 'hex')` côté Postgres.
 */
export async function hashCode(code: string): Promise<string> {
  const normalized = code.trim().toUpperCase();
  const data = new TextEncoder().encode(normalized);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
