import { lireStreak, minutesPourActe } from './economy.ts';
import type { Acte, Foyer } from './types.ts';

export type ProchainActe = {
  acte: Acte;
  minutes: number;
  streakJours: number;
  streakRequis: number | null;
};

/**
 * Premier acte actif sans déclaration en attente pour cet enfant.
 * Priorité aux séries presque complètes, puis à l’ordre du catalogue.
 */
export function prochainActe(
  foyer: Foyer,
  enfantId: string
): ProchainActe | null {
  const pending = new Set(
    foyer.declarations
      .filter(
        d =>
          d.statut === 'en_attente' &&
          (d.declarePar === enfantId || d.participants.includes(enfantId))
      )
      .map(d => d.acteId)
  );

  const candidats = foyer.actes
    .filter(a => a.actif && !pending.has(a.id))
    .sort((a, b) => {
      const sa = a.streak
        ? a.streak.joursRequis - lireStreak(foyer, enfantId, a.id).jours
        : Number.POSITIVE_INFINITY;
      const sb = b.streak
        ? b.streak.joursRequis - lireStreak(foyer, enfantId, b.id).jours
        : Number.POSITIVE_INFINITY;
      if (sa !== sb) return sa - sb;
      return a.ordre - b.ordre;
    });

  const acte = candidats[0];
  if (!acte) return null;

  const reward = minutesPourActe(acte, foyer.pointsTaux, foyer.minutesTaux);
  const streak = lireStreak(foyer, enfantId, acte.id);
  return {
    acte,
    minutes: reward.minutes,
    streakJours: streak.jours,
    streakRequis: acte.streak?.joursRequis ?? null,
  };
}
