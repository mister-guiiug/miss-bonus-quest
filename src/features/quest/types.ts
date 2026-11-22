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
  /** Clé lucide locale (`bed`, `table`…) — optionnelle. */
  icone?: string | null;
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
  /** Lien Supabase Auth quand le parent s’est connecté (ADR 0016). */
  authUserId?: string | null;
  /** Hash SHA-256 du PIN enfant (4 chiffres) — jamais le plaintext. */
  pinHash?: string | null;
  /** Emoji d’avatar (sinon initiales). */
  avatarEmoji?: string | null;
  /** Couleur CSS d’avatar (sinon muted). */
  avatarColor?: string | null;
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
  /** Code lecture seule (grand-parent) — vide = désactivé. */
  codeLecture?: string;
  /**
   * Plafond de minutes gagnées / enfant / jour Paris.
   * `null` ou `0` = pas de plafond.
   */
  plafondMinutesJour?: number | null;
  membres: Membre[];
  actes: Acte[];
  declarations: Declaration[];
  mouvements: MouvementSolde[];
  streaks: Record<string, StreakProgress>;
  /** Horodatage ISO de la dernière mutation locale — sert au conflit sync. */
  updatedAt: string;
  /** `auth.uid()` du parent propriétaire (ADR 0016). */
  ownerAuthId?: string | null;
}

export interface SessionLocale {
  role: Role;
  membreId: string;
  /** Code saisi pour poll enfant / co-parent (ADR 0016). */
  codeInvite?: string;
  /** Session ouverte avec le code lecture — pas de mutation. */
  lectureSeule?: boolean;
}

export function streakKey(enfantId: string, acteId: string): string {
  return `${enfantId}:${acteId}`;
}
