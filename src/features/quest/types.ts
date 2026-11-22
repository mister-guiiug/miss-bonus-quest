export type Role = 'parent' | 'enfant';

export type PorteeActe = 'perso' | 'collectif';

export type StatutDeclaration = 'en_attente' | 'validee' | 'refusee';

export type TypeMouvement =
  'credit_validation' | 'credit_manuel' | 'bonus_streak' | 'consommation';

export interface StreakConfig {
  joursRequis: number;
  bonusPoints: number;
  bonusMinutes: number;
}

export interface Acte {
  id: string;
  titre: string;
  description: string;
  portee: PorteeActe;
  points: number;
  minutesDirectes: number;
  streak: StreakConfig | null;
  actif: boolean;
  ordre: number;
}

export interface Membre {
  id: string;
  role: Role;
  displayName: string;
  actif: boolean;
}

export interface Declaration {
  id: string;
  acteId: string;
  declarePar: string;
  statut: StatutDeclaration;
  motifRefus: string | null;
  validePar: string | null;
  participants: string[];
  createdAt: string;
  decidedAt: string | null;
}

export interface MouvementSolde {
  id: string;
  enfantId: string;
  type: TypeMouvement;
  minutes: number;
  pointsSource: number | null;
  declarationId: string | null;
  note: string | null;
  createdAt: string;
  createdBy: string;
}

/** Progression de série pour un couple enfant + acte. */
export interface StreakProgress {
  jours: number;
  /** Jour calendaire Europe/Paris `YYYY-MM-DD` de la dernière validation. */
  lastDay: string | null;
}

export interface Foyer {
  id: string;
  nom: string;
  /** Ex. 10 points → 5 minutes. */
  pointsTaux: number;
  minutesTaux: number;
  codeEnfant: string;
  codeCoparent: string;
  membres: Membre[];
  actes: Acte[];
  declarations: Declaration[];
  mouvements: MouvementSolde[];
  streaks: Record<string, StreakProgress>;
  /** Horodatage ISO de la dernière mutation locale — sert au conflit sync. */
  updatedAt: string;
}

export interface SessionLocale {
  role: Role;
  membreId: string;
}

export function streakKey(enfantId: string, acteId: string): string {
  return `${enfantId}:${acteId}`;
}
