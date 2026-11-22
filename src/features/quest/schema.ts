import { z } from 'zod';

const streakConfigSchema = z.object({
  joursRequis: z.number().int().positive(),
  bonusPoints: z.number().int().nonnegative(),
  bonusMinutes: z.number().int().nonnegative(),
});

const acteSchema = z.object({
  id: z.string().min(1),
  titre: z.string().min(1),
  description: z.string(),
  portee: z.enum(['perso', 'collectif']),
  points: z.number().int().nonnegative(),
  minutesDirectes: z.number().int().nonnegative(),
  streak: streakConfigSchema.nullable(),
  actif: z.boolean(),
  ordre: z.number().int(),
});

const membreSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['parent', 'enfant']),
  displayName: z.string().min(1),
  actif: z.boolean(),
});

const declarationSchema = z.object({
  id: z.string().min(1),
  acteId: z.string().min(1),
  declarePar: z.string().min(1),
  statut: z.enum(['en_attente', 'validee', 'refusee']),
  motifRefus: z.string().nullable(),
  validePar: z.string().nullable(),
  participants: z.array(z.string().min(1)),
  createdAt: z.string().min(1),
  decidedAt: z.string().nullable(),
});

const mouvementSchema = z.object({
  id: z.string().min(1),
  enfantId: z.string().min(1),
  type: z.enum([
    'credit_validation',
    'credit_manuel',
    'bonus_streak',
    'consommation',
  ]),
  minutes: z.number().int(),
  pointsSource: z.number().int().nullable(),
  declarationId: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string().min(1),
  createdBy: z.string().min(1),
});

const streakProgressSchema = z.object({
  jours: z.number().int().nonnegative(),
  lastDay: z.string().nullable(),
});

export const foyerSchema = z.object({
  id: z.string().min(1),
  nom: z.string().min(1),
  pointsTaux: z.number().int().positive(),
  minutesTaux: z.number().int().nonnegative(),
  codeEnfant: z.string().min(1),
  codeCoparent: z.string().min(1),
  membres: z.array(membreSchema).min(1),
  actes: z.array(acteSchema),
  declarations: z.array(declarationSchema),
  mouvements: z.array(mouvementSchema),
  streaks: z.record(z.string(), streakProgressSchema),
});

export const sessionSchema = z.object({
  role: z.enum(['parent', 'enfant']),
  membreId: z.string().min(1),
});

export type FoyerData = z.infer<typeof foyerSchema>;
