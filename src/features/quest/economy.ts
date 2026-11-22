import type { Acte, Foyer, StreakProgress } from './types.ts';
import { streakKey } from './types.ts';

const TZ = 'Europe/Paris';

/** Jour calendaire Europe/Paris `YYYY-MM-DD`. */
export function jourParis(iso = new Date().toISOString()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

/** Jours calendaires entre deux `YYYY-MM-DD` (a − b), approximés en UTC midi. */
export function diffJours(a: string, b: string): number {
  const ta = Date.parse(`${a}T12:00:00Z`);
  const tb = Date.parse(`${b}T12:00:00Z`);
  return Math.round((ta - tb) / 86_400_000);
}

export function minutesFromPoints(
  points: number,
  pointsTaux: number,
  minutesTaux: number
): number {
  if (points <= 0 || pointsTaux <= 0 || minutesTaux < 0) return 0;
  return Math.floor((points * minutesTaux) / pointsTaux);
}

/** Minutes créditées pour un acte validé (hors bonus streak). */
export function minutesPourActe(
  acte: Acte,
  pointsTaux: number,
  minutesTaux: number
): { minutes: number; fromPoints: number; directes: number } {
  const fromPoints = minutesFromPoints(acte.points, pointsTaux, minutesTaux);
  return {
    minutes: fromPoints + acte.minutesDirectes,
    fromPoints,
    directes: acte.minutesDirectes,
  };
}

export function soldeMinutes(foyer: Foyer, enfantId: string): number {
  const total = foyer.mouvements
    .filter(m => m.enfantId === enfantId)
    .reduce((acc, m) => acc + m.minutes, 0);
  return Math.max(0, total);
}

/**
 * Met à jour la série après une validation du jour.
 * Si le palier est atteint : bonus + reset à 0.
 */
export function avancerStreak(
  progress: StreakProgress | undefined,
  acte: Acte,
  jour: string,
  pointsTaux: number,
  minutesTaux: number
): {
  progress: StreakProgress;
  bonusMinutes: number;
  bonusPoints: number;
} {
  if (!acte.streak) {
    return {
      progress: progress ?? { jours: 0, lastDay: null },
      bonusMinutes: 0,
      bonusPoints: 0,
    };
  }

  let jours = 1;
  if (progress?.lastDay) {
    const delta = diffJours(jour, progress.lastDay);
    if (delta === 0) {
      jours = Math.max(1, progress.jours);
    } else if (delta === 1) {
      jours = progress.jours + 1;
    }
  }

  let bonusMinutes = 0;
  let bonusPoints = 0;
  if (jours >= acte.streak.joursRequis) {
    bonusPoints = acte.streak.bonusPoints;
    bonusMinutes =
      acte.streak.bonusMinutes +
      minutesFromPoints(bonusPoints, pointsTaux, minutesTaux);
    return {
      progress: { jours: 0, lastDay: jour },
      bonusMinutes,
      bonusPoints,
    };
  }

  return {
    progress: { jours, lastDay: jour },
    bonusMinutes: 0,
    bonusPoints: 0,
  };
}

export function lireStreak(
  foyer: Foyer,
  enfantId: string,
  acteId: string
): StreakProgress {
  return foyer.streaks[streakKey(enfantId, acteId)] ?? {
    jours: 0,
    lastDay: null,
  };
}
