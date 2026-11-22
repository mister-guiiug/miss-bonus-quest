/** Préférences appareil (pas dans le snapshot foyer). */

const SOUND_KEY = 'miss-bonus-quest_sound';

export function sonActive(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSonActive(on: boolean): void {
  try {
    if (on) localStorage.setItem(SOUND_KEY, '1');
    else localStorage.removeItem(SOUND_KEY);
  } catch {
    /* private mode */
  }
}
