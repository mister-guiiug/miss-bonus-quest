import { sonActive } from './prefs.ts';

/** Bip court optionnel — off par défaut (prefs). */
export function playQuestSound(kind: 'ok' | 'soft' = 'soft'): void {
  if (!sonActive()) return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = kind === 'ok' ? 660 : 440;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.stop(ctx.currentTime + 0.13);
    void ctx.resume();
    window.setTimeout(() => void ctx.close(), 200);
  } catch {
    /* ignore */
  }
}
