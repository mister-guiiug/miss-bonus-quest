/** Invitation par URL `?code=` — schéma web (PWA), pas `missbonus:` natif. */

const PORTE_KEY = 'miss-bonus-quest_porte';

export function porteChoisie(): boolean {
  try {
    return localStorage.getItem(PORTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function marquerPorteChoisie(): void {
  try {
    localStorage.setItem(PORTE_KEY, '1');
  } catch {
    /* private mode */
  }
}

/** Lit `?code=` (ou hash) et le normalise. */
export function lireCodeInviteUrl(
  search = typeof window !== 'undefined' ? window.location.search : ''
): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get('code')?.trim().toUpperCase();
  return raw && raw.length > 0 ? raw : null;
}

/** URL à encoder dans le QR — ouvre l’app avec le code prérempli. */
export function urlInvitation(
  code: string,
  origin = typeof window !== 'undefined' ? window.location.origin : '',
  base = import.meta.env.BASE_URL || '/'
): string {
  const root = base.endsWith('/') ? base : `${base}/`;
  const url = new URL(root, origin || 'https://example.invalid');
  url.searchParams.set('code', code.trim().toUpperCase());
  return url.toString();
}
