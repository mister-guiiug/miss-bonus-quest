import { create } from 'zustand';
import { createId } from '@mister-guiiug/dev-pwa-config/id';
import { generateCode } from '@mister-guiiug/dev-pwa-config/pairing';
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
  Acte,
  Declaration,
  Foyer,
  Membre,
  MouvementSolde,
  PorteeActe,
  SessionLocale,
  StreakConfig,
} from './types.ts';
import { streakKey } from './types.ts';

const SESSION_KEY = 'miss-bonus-quest_session';

function nouveauCode(longueur = 6): string {
  return generateCode(longueur, { alphabet: 'antiConfusion' });
}

export type ActeBrouillon = {
  titre: string;
  description: string;
  icone?: string | null;
  portee: PorteeActe;
  points: number;
  minutesDirectes: number;
  streak: StreakConfig | null;
  actif: boolean;
};

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
  /** Foyer distant en conflit — à trancher dans l’UI. */
  conflict: Foyer | null;
  load: () => void;
  choisirRole: (session: SessionLocale) => void;
  quitterSession: () => void;
  /** Lie le compte Supabase au parent courant / propriétaire du foyer. */
  lierCompteParent: (authUserId: string, membreId?: string) => void;
  setConflict: (foyer: Foyer | null) => void;
  resoudreConflit: (choix: 'local' | 'cloud') => void;
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
  deverrouillerParCode: (
    code: string
  ) => { role: 'enfant' | 'coparent' } | null;
  majFoyer: (patch: {
    nom?: string;
    pointsTaux?: number;
    minutesTaux?: number;
  }) => string | null;
  regenererCode: (quel: 'enfant' | 'coparent') => string | null;
  ajouterMembre: (
    role: 'parent' | 'enfant',
    displayName: string
  ) => string | null;
  retirerMembre: (membreId: string) => string | null;
  upsertActe: (
    acteId: string | null,
    brouillon: ActeBrouillon
  ) => string | null;
  setActeActif: (acteId: string, actif: boolean) => string | null;
  /**
   * Après code enfant : crée un profil sans session parent.
   * Renvoie l’id créé, ou un code d’erreur.
   */
  creerEnfantApresCode: (displayName: string) => string;
  /**
   * Applique un foyer distant. `force` écrase même si le local est plus récent.
   * Renvoie `conflit` si le local a un `updatedAt` plus récent.
   */
  appliquerFoyerDistant: (
    foyer: Foyer,
    opts?: { force?: boolean }
  ) => 'ok' | 'conflit';
  exportJson: () => string | null;
  importJson: (json: string) => number | null;
  reset: () => void;
}

function sauver(foyer: Foyer) {
  const stamped: Foyer = {
    ...foyer,
    updatedAt: new Date().toISOString(),
  };
  foyerStore.save(stamped);
  return stamped;
}

export const useQuest = create<QuestState>((set, get) => ({
  foyer: foyerStore.load(),
  session: null,
  ready: false,
  conflict: null,

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

  lierCompteParent(authUserId, membreId) {
    const { foyer, session } = get();
    const cible = membreId ?? session?.membreId;
    const next: Foyer = {
      ...foyer,
      ownerAuthId: foyer.ownerAuthId ?? authUserId,
      membres: foyer.membres.map(m =>
        m.id === cible && m.role === 'parent' ? { ...m, authUserId } : m
      ),
    };
    set({ foyer: sauver(next) });
  },

  setConflict(foyer) {
    set({ conflict: foyer });
  },

  resoudreConflit(choix) {
    const { conflict, foyer } = get();
    if (!conflict) return;
    if (choix === 'cloud') {
      foyerStore.save(conflict);
      set({ foyer: conflict, conflict: null });
      return;
    }
    set({ conflict: null, foyer: sauver(foyer) });
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
    set({ foyer: sauver(next) });
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
    set({ foyer: sauver(next) });
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
    set({ foyer: sauver(next) });
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
    set({ foyer: sauver(next) });
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
    set({ foyer: sauver(next) });
    return null;
  },

  solde(enfantId) {
    return soldeMinutes(get().foyer, enfantId);
  },

  deverrouillerParCode(code) {
    const c = code.trim().toUpperCase();
    const { foyer } = get();
    if (c === foyer.codeEnfant.toUpperCase()) return { role: 'enfant' };
    if (c === foyer.codeCoparent.toUpperCase()) return { role: 'coparent' };
    return null;
  },

  majFoyer(patch) {
    const { foyer, session } = get();
    if (!session || session.role !== 'parent') return 'parent-inconnu';
    const next: Foyer = {
      ...foyer,
      nom: patch.nom?.trim() || foyer.nom,
      pointsTaux: patch.pointsTaux ?? foyer.pointsTaux,
      minutesTaux: patch.minutesTaux ?? foyer.minutesTaux,
    };
    if (next.pointsTaux <= 0) return 'taux-invalide';
    if (next.minutesTaux < 0) return 'taux-invalide';
    set({ foyer: sauver(next) });
    return null;
  },

  regenererCode(quel) {
    const { foyer, session } = get();
    if (!session || session.role !== 'parent') return 'parent-inconnu';
    const next: Foyer = {
      ...foyer,
      codeEnfant: quel === 'enfant' ? nouveauCode() : foyer.codeEnfant,
      codeCoparent: quel === 'coparent' ? nouveauCode() : foyer.codeCoparent,
    };
    set({ foyer: sauver(next) });
    return null;
  },

  ajouterMembre(role, displayName) {
    const { foyer, session } = get();
    if (!session || session.role !== 'parent') return 'parent-inconnu';
    const nom = displayName.trim();
    if (!nom) return 'nom-requis';
    const membre: Membre = {
      id: createId('membre'),
      role,
      displayName: nom,
      actif: true,
    };
    const next: Foyer = { ...foyer, membres: [...foyer.membres, membre] };
    set({ foyer: sauver(next) });
    return null;
  },

  retirerMembre(membreId) {
    const { foyer, session } = get();
    if (!session || session.role !== 'parent') return 'parent-inconnu';
    if (membreId === session.membreId) return 'soi-interdit';
    const cible = foyer.membres.find(m => m.id === membreId);
    if (!cible) return 'membre-inconnu';
    const parentsActifs = foyer.membres.filter(
      m => m.role === 'parent' && m.actif && m.id !== membreId
    );
    if (cible.role === 'parent' && parentsActifs.length === 0) {
      return 'dernier-parent';
    }
    const next: Foyer = {
      ...foyer,
      membres: foyer.membres.map(m =>
        m.id === membreId ? { ...m, actif: false } : m
      ),
    };
    set({ foyer: sauver(next) });
    return null;
  },

  upsertActe(acteId, brouillon) {
    const { foyer, session } = get();
    if (!session || session.role !== 'parent') return 'parent-inconnu';
    const titre = brouillon.titre.trim();
    if (!titre) return 'titre-requis';
    if (brouillon.points < 0 || brouillon.minutesDirectes < 0) {
      return 'recompense-invalide';
    }

    let actes: Acte[];
    if (acteId) {
      if (!foyer.actes.some(a => a.id === acteId)) return 'acte-inconnu';
      actes = foyer.actes.map(a =>
        a.id === acteId
          ? {
              ...a,
              titre,
              description: brouillon.description.trim(),
              icone: brouillon.icone ?? a.icone ?? null,
              portee: brouillon.portee,
              points: brouillon.points,
              minutesDirectes: brouillon.minutesDirectes,
              streak: brouillon.streak,
              actif: brouillon.actif,
            }
          : a
      );
    } else {
      const ordre =
        foyer.actes.reduce((max, a) => Math.max(max, a.ordre), 0) + 1;
      actes = [
        ...foyer.actes,
        {
          id: createId('acte'),
          titre,
          description: brouillon.description.trim(),
          icone: brouillon.icone ?? null,
          portee: brouillon.portee,
          points: brouillon.points,
          minutesDirectes: brouillon.minutesDirectes,
          streak: brouillon.streak,
          actif: brouillon.actif,
          ordre,
        },
      ];
    }
    const next: Foyer = { ...foyer, actes };
    set({ foyer: sauver(next) });
    return null;
  },

  setActeActif(acteId, actif) {
    const { foyer, session } = get();
    if (!session || session.role !== 'parent') return 'parent-inconnu';
    if (!foyer.actes.some(a => a.id === acteId)) return 'acte-inconnu';
    const next: Foyer = {
      ...foyer,
      actes: foyer.actes.map(a => (a.id === acteId ? { ...a, actif } : a)),
    };
    set({ foyer: sauver(next) });
    return null;
  },

  creerEnfantApresCode(displayName) {
    const nom = displayName.trim();
    if (!nom) return 'nom-requis';
    const { foyer } = get();
    const membre: Membre = {
      id: createId('membre'),
      role: 'enfant',
      displayName: nom,
      actif: true,
    };
    const next: Foyer = { ...foyer, membres: [...foyer.membres, membre] };
    set({ foyer: sauver(next) });
    return membre.id;
  },

  appliquerFoyerDistant(foyer, opts) {
    const local = get().foyer;
    const distantAt = foyer.updatedAt ?? new Date(0).toISOString();
    const localAt = local.updatedAt ?? new Date(0).toISOString();
    if (!opts?.force && localAt > distantAt && local.id === foyer.id) {
      return 'conflit';
    }
    const normalized: Foyer = {
      ...foyer,
      updatedAt: foyer.updatedAt ?? distantAt,
    };
    foyerStore.save(normalized);
    set({ foyer: normalized });
    return 'ok';
  },

  exportJson() {
    return exportFoyer();
  },

  importJson(json) {
    try {
      const foyer = importFoyer(json);
      set({ foyer: sauver(foyer) });
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
