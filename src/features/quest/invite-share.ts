import { urlInvitation } from './deep-link.ts';

/** Partage ou copie l’URL d’invitation. */
export async function partagerInvitation(
  code: string
): Promise<'shared' | 'copied' | 'failed'> {
  const url = urlInvitation(code);
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ url, title: 'Miss Bonus Quest' });
      return 'shared';
    }
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
