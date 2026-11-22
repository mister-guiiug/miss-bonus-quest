/** Retour haptique léger — no-op si l’API n’existe pas. */

export function hapticLight(): void {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* ignore */
  }
}

export function hapticSuccess(): void {
  try {
    navigator.vibrate?.([10, 40, 18]);
  } catch {
    /* ignore */
  }
}
