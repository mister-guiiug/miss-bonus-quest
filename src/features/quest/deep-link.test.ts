import { describe, expect, it } from 'vitest';
import { lireCodeInviteUrl, urlInvitation } from './deep-link.ts';

describe('deep-link', () => {
  it('lit le code depuis la query', () => {
    expect(lireCodeInviteUrl('?code=bonus')).toBe('BONUS');
    expect(lireCodeInviteUrl('?foo=1')).toBeNull();
  });

  it('construit une URL d’invitation', () => {
    expect(urlInvitation('bonus', 'https://ex.test', '/miss-bonus-quest/')).toBe(
      'https://ex.test/miss-bonus-quest/?code=BONUS'
    );
  });
});
