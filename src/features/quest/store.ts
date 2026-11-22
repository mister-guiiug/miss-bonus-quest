import { create } from 'zustand';
import { createId } from '@mister-guiiug/dev-pwa-config/id';
import {
  avancerStreak,
  jourParis,
  minutesPourActe,
  soldeMinutes,
} from './economy.ts';
import {
  clearFoyer,
  exportFoyer,
  foyerStore,
  importFoyer,
} from './persistence.ts';
import type {
  Declaration,
  Foyer,
  MouvementSolde,
  SessionLocale,
} from './types.ts';
import { streakKey } from './types.ts';

const SESSION_KEY = 'miss-bonus-quest_session';

function lireSession(): SessionLocale | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionLocale;
  } catch {
    return null;
  }
}

function ecrireSession(session: SessionLocale | null) {
  if (!session) sessionStorage.removeItem(SESSION_KEY);
  else sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

interface QuestState {
  foyer: Foyer;
  session: SessionLocale | null;
  ready: boolean;
  load: () => void;
  choisirRole: (session: SessionLocale) => void;
  quitterSession: () => void;
  declarer: (acteId: string, participants: string[]) => string | null;
  valider: (declarationId: string, parentId: string) => string | null;
  refuser: (
    declarationId: string,
    parentId: string,
    motif?: string
  ) => string | null;
  creditManuel: (
    acteId: string,
    enfantIds: string[],
    parentId: string
  ) => string | null;
  consommer: (
    enfantId: string,
    minutes: number,
    parentId: string
  ) => string | null;
  solde: (enfantId: string) => number;
  exportJson: () => string | null;
  importJson: (json: string) => number | null;
  reset: () => void;
}

function sauver(foyer: Foyer) {
  foyerStore.save(foyer);
}

export const useQuest = create<QuestState>((set, get) => ({
  foyer: foyerStore.load(),
  session: null,
  ready: false,

  load() {
    set({
      foyer: foyerStore.load(),
      session: lireSession(),
      ready: true,
    });
  },

  choisirRole(session) {
    ecrireSession(session);
    set({ session });
  },

  quitterSession() {
    ecrireSession(null);
    set({ session: null });
  },

  declarer(acteId, participants) {
    const { foyer, session } = get();
    if (!session || session.role !== 'enfant') return 'session-enfant-requise';
    const acte = foyer.actes.find(a => a.id === acteId && a.actif);
    if (!acte) return 'acte-inconnu';

    const deja = foyer.declarations.some(
      d =>
        d.acteId === acteId &&
        d.declarePar === session.membreId &&
        d.statut === 'en_attente'
    );
    if (deja) return 'deja-en-attente';

    const parts =
      acte.portee === 'collectif'
        ? participants.length > 0
          ? participants
          : [session.membreId]
        : [session.membreId];

    const declaration: Declaration = {
      id: createId('decl'),
      acteId,
      declarePar: session.membreId,
      statut: 'en_attente',
      motifRefus: null,
      validePar: null,
      participants: parts,
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };

    const next = {
      ...foyer,
      declarations: [declaration, ...foyer.declarations],
    };
    sauver(next);
    set({ foyer: next });
    return null;
  },

  valider(declarationId, parentId) {
    const { foyer } = get();
    const parent = foyer.membres.find(
      m => m.id === parentId && m.role === 'parent'
    );
    if (!parent) return 'parent-inconnu';

    const decl = foyer.declarations.find(d => d.id === declarationId);
    if (!decl) return 'declaration-inconnue';
    if (decl.statut !== 'en_attente') return 'deja-decidee';

    const acte = foyer.actes.find(a => a.id === decl.acteId);
    if (!acte) return 'acte-inconnu';

    const now = new Date().toISOString();
    const jour = jourParis(now);
    const { minutes, fromPoints } = minutesPourActe(
      acte,
      foyer.pointsTaux,
      foyer.minutesTaux
    );

    const mouvements: MouvementSolde[] = [...foyer.mouvements];
    const streaks = { ...foyer.streaks };

    for (const enfantId of decl.participants) {
      mouvements.push({
        id: createId('mvt'),
        enfantId,
        type: 'credit_validation',
        minutes,
        pointsSource: fromPoints > 0 ? acte.points : null,
        declarationId: decl.id,
        note: null,
        createdAt: now,
        createdBy: parentId,
      });

      const key = streakKey(enfantId, acte.id);
      const { progress, bonusMinutes, bonusPoints } = avancerStreak(
        streaks[key],
        acte,
        jour,
        foyer.pointsTaux,
        foyer.minutesTaux
      );
      streaks[key] = progress;
      if (bonusMinutes > 0) {
        mouvements.push({
          id: createId('mvt'),
          enfantId,
          type: 'bonus_streak',
          minutes: bonusMinutes,
          pointsSource: bonusPoints > 0 ? bonusPoints : null,
          declarationId: decl.id,
          note: `Palier ${acte.streak?.joursRequis ?? 0} jours`,
          createdAt: now,
          createdBy: parentId,
        });
      }
    }

    const next: Foyer = {
      ...foyer,
      mouvements,
      streaks,
      declarations: foyer.declarations.map(d =>
        d.id === declarationId
          ? {
              ...d,
              statut: 'validee' as const,
              validePar: parentId,
              decidedAt: now,
            }
          : d
      ),
    };
    sauver(next);
    set({ foyer: next });
    return null;
  },

  refuser(declarationId, parentId, motif) {
    const { foyer } = get();
    const parent = foyer.membres.find(
      m => m.id === parentId && m.role === 'parent'
    );
    if (!parent) return 'parent-inconnu';
    const decl = foyer.declarations.find(d => d.id === declarationId);
    if (!decl) return 'declaration-inconnue';
    if (decl.statut !== 'en_attente') return 'deja-decidee';

    const now = new Date().toISOString();
    const next: Foyer = {
      ...foyer,
      declarations: foyer.declarations.map(d =>
        d.id === declarationId
          ? {
              ...d,
              statut: 'refusee' as const,
              motifRefus: motif?.trim() || null,
              validePar: parentId,
              decidedAt: now,
            }
          : d
      ),
    };
    sauver(next);
    set({ foyer: next });
    return null;
  },

  creditManuel(acteId, enfantIds, parentId) {
    const { foyer } = get();
    const parent = foyer.membres.find(
      m => m.id === parentId && m.role === 'parent'
    );
    if (!parent) return 'parent-inconnu';
    const acte = foyer.actes.find(a => a.id === acteId && a.actif);
    if (!acte) return 'acte-inconnu';
    if (enfantIds.length === 0) return 'enfants-requis';

    const now = new Date().toISOString();
    const { minutes, fromPoints } = minutesPourActe(
      acte,
      foyer.pointsTaux,
      foyer.minutesTaux
    );

    const declaration: Declaration = {
      id: createId('decl'),
      acteId,
      declarePar: parentId,
      statut: 'validee',
      motifRefus: null,
      validePar: parentId,
      participants: enfantIds,
      createdAt: now,
      decidedAt: now,
    };

    const mouvements: MouvementSolde[] = [
      ...foyer.mouvements,
      ...enfantIds.map(enfantId => ({
        id: createId('mvt'),
        enfantId,
        type: 'credit_manuel' as const,
        minutes,
        pointsSource: fromPoints > 0 ? acte.points : null,
        declarationId: declaration.id,
        note: 'Crédit parent',
        createdAt: now,
        createdBy: parentId,
      })),
    ];

    const next: Foyer = {
      ...foyer,
      declarations: [declaration, ...foyer.declarations],
      mouvements,
    };
    sauver(next);
    set({ foyer: next });
    return null;
  },

  consommer(enfantId, minutes, parentId) {
    const { foyer } = get();
    const parent = foyer.membres.find(
      m => m.id === parentId && m.role === 'parent'
    );
    if (!parent) return 'parent-inconnu';
    if (minutes <= 0) return 'minutes-invalides';
    const enfant = foyer.membres.find(
      m => m.id === enfantId && m.role === 'enfant'
    );
    if (!enfant) return 'enfant-inconnu';

    const dispo = soldeMinutes(foyer, enfantId);
    const debit = Math.min(minutes, dispo);
    if (debit <= 0) return 'solde-vide';

    const now = new Date().toISOString();
    const mouvement: MouvementSolde = {
      id: createId('mvt'),
      enfantId,
      type: 'consommation',
      minutes: -debit,
      pointsSource: null,
      declarationId: null,
      note: null,
      createdAt: now,
      createdBy: parentId,
    };
    const next: Foyer = {
      ...foyer,
      mouvements: [mouvement, ...foyer.mouvements],
    };
    sauver(next);
    set({ foyer: next });
    return null;
  },

  solde(enfantId) {
    return soldeMinutes(get().foyer, enfantId);
  },

  exportJson() {
    return exportFoyer();
  },

  importJson(json) {
    try {
      const foyer = importFoyer(json);
      set({ foyer });
      return foyer.membres.filter(m => m.role === 'enfant').length;
    } catch {
      return null;
    }
  },

  reset() {
    clearFoyer();
    ecrireSession(null);
    set({ foyer: foyerStore.load(), session: null });
  },
}));
