import { beforeEach, describe, expect, it } from 'vitest';
import { useQuest } from './store.ts';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useQuest.getState().reset();
  useQuest.getState().load();
});

describe('useQuest MVP1', () => {
  it('déclare, valide et crédite le solde', () => {
    const state = useQuest.getState();
    const enfant = state.foyer.membres.find(m => m.role === 'enfant')!;
    const parent = state.foyer.membres.find(m => m.role === 'parent')!;
    const acte = state.foyer.actes.find(a => a.titre === 'Ranger sa chambre')!;

    state.choisirRole({ role: 'enfant', membreId: enfant.id });
    expect(state.declarer(acte.id, [])).toBeNull();

    const decl = useQuest.getState().foyer.declarations[0]!;
    expect(decl.statut).toBe('en_attente');

    useQuest.getState().choisirRole({ role: 'parent', membreId: parent.id });
    expect(useQuest.getState().valider(decl.id, parent.id)).toBeNull();

    // 15 pts → 7 min + 5 directes = 12
    expect(useQuest.getState().solde(enfant.id)).toBe(12);
    expect(useQuest.getState().foyer.declarations[0]!.statut).toBe('validee');
  });

  it('refuse une seconde déclaration en attente du même acte', () => {
    const state = useQuest.getState();
    const enfant = state.foyer.membres.find(m => m.role === 'enfant')!;
    const acte = state.foyer.actes[0]!;
    state.choisirRole({ role: 'enfant', membreId: enfant.id });
    expect(state.declarer(acte.id, [])).toBeNull();
    expect(useQuest.getState().declarer(acte.id, [])).toBe('deja-en-attente');
  });

  it('crédite manuellement et consomme sans passer sous zéro', () => {
    const state = useQuest.getState();
    const enfant = state.foyer.membres.find(m => m.role === 'enfant')!;
    const parent = state.foyer.membres.find(m => m.role === 'parent')!;
    const acte = state.foyer.actes.find(a => a.titre === 'Passer le balai')!;

    expect(state.creditManuel(acte.id, [enfant.id], parent.id)).toBeNull();
    // 10 pts → 5 + 5 directes = 10
    expect(useQuest.getState().solde(enfant.id)).toBe(10);

    expect(useQuest.getState().consommer(enfant.id, 4, parent.id)).toBeNull();
    expect(useQuest.getState().solde(enfant.id)).toBe(6);

    expect(useQuest.getState().consommer(enfant.id, 100, parent.id)).toBeNull();
    expect(useQuest.getState().solde(enfant.id)).toBe(0);
  });
});

describe('useQuest MVP2', () => {
  it('déverrouille par code enfant et co-parent', () => {
    const state = useQuest.getState();
    expect(state.deverrouillerParCode('bonus')).toEqual({ role: 'enfant' });
    expect(state.deverrouillerParCode('PARENT')).toEqual({ role: 'coparent' });
    expect(state.deverrouillerParCode('XXXX')).toBeNull();
  });

  it('refuse une déclaration avec motif', () => {
    const state = useQuest.getState();
    const enfant = state.foyer.membres.find(m => m.role === 'enfant')!;
    const parent = state.foyer.membres.find(m => m.role === 'parent')!;
    const acte = state.foyer.actes[0]!;

    state.choisirRole({ role: 'enfant', membreId: enfant.id });
    expect(state.declarer(acte.id, [])).toBeNull();
    const decl = useQuest.getState().foyer.declarations[0]!;

    useQuest.getState().choisirRole({ role: 'parent', membreId: parent.id });
    expect(
      useQuest.getState().refuser(decl.id, parent.id, 'Pas assez soigné')
    ).toBeNull();

    const after = useQuest.getState().foyer.declarations[0]!;
    expect(after.statut).toBe('refusee');
    expect(after.motifRefus).toBe('Pas assez soigné');
    expect(useQuest.getState().solde(enfant.id)).toBe(0);
  });

  it('met à jour le foyer et régénère un code', () => {
    const state = useQuest.getState();
    const parent = state.foyer.membres.find(m => m.role === 'parent')!;
    state.choisirRole({ role: 'parent', membreId: parent.id });

    expect(
      state.majFoyer({ nom: 'Chez nous', pointsTaux: 20, minutesTaux: 10 })
    ).toBeNull();
    expect(useQuest.getState().foyer.nom).toBe('Chez nous');
    expect(useQuest.getState().foyer.pointsTaux).toBe(20);

    const avant = useQuest.getState().foyer.codeEnfant;
    expect(useQuest.getState().regenererCode('enfant')).toBeNull();
    expect(useQuest.getState().foyer.codeEnfant).not.toBe(avant);
  });

  it('ajoute un enfant et crée un acte', () => {
    const state = useQuest.getState();
    const parent = state.foyer.membres.find(m => m.role === 'parent')!;
    state.choisirRole({ role: 'parent', membreId: parent.id });

    expect(state.ajouterMembre('enfant', 'Nina')).toBeNull();
    expect(
      useQuest.getState().foyer.membres.some(m => m.displayName === 'Nina')
    ).toBe(true);

    const avant = useQuest.getState().foyer.actes.length;
    expect(
      state.upsertActe(null, {
        titre: 'Vider le lave-vaisselle',
        description: 'tous les jours',
        portee: 'perso',
        points: 8,
        minutesDirectes: 2,
        streak: null,
        actif: true,
      })
    ).toBeNull();
    expect(useQuest.getState().foyer.actes.length).toBe(avant + 1);
  });
});

describe('useQuest MVP3', () => {
  it('horodate chaque mutation et détecte un conflit distant', () => {
    const state = useQuest.getState();
    const parent = state.foyer.membres.find(m => m.role === 'parent')!;
    state.choisirRole({ role: 'parent', membreId: parent.id });

    const avant = useQuest.getState().foyer.updatedAt;
    expect(avant).toBeTruthy();

    expect(state.majFoyer({ nom: 'Plus tard' })).toBeNull();
    const apres = useQuest.getState().foyer.updatedAt;
    expect(apres >= avant).toBe(true);

    const local = useQuest.getState().foyer;
    const vieux = {
      ...local,
      nom: 'Ancien cloud',
      updatedAt: new Date(0).toISOString(),
    };
    expect(useQuest.getState().appliquerFoyerDistant(vieux)).toBe('conflit');
    expect(useQuest.getState().foyer.nom).toBe('Plus tard');

    expect(
      useQuest.getState().appliquerFoyerDistant(vieux, { force: true })
    ).toBe('ok');
    expect(useQuest.getState().foyer.nom).toBe('Ancien cloud');
  });

  it('crée un enfant après code sans session parent', () => {
    const state = useQuest.getState();
    expect(state.deverrouillerParCode(state.foyer.codeEnfant)).toEqual({
      role: 'enfant',
    });
    const id = state.creerEnfantApresCode('Léo');
    expect(id).not.toBe('nom-requis');
    expect(
      useQuest
        .getState()
        .foyer.membres.some(m => m.id === id && m.displayName === 'Léo')
    ).toBe(true);
    expect(state.creerEnfantApresCode('  ')).toBe('nom-requis');
  });

  it('lie le compte parent et résout un conflit', () => {
    const state = useQuest.getState();
    const parent = state.foyer.membres.find(m => m.role === 'parent')!;
    state.choisirRole({ role: 'parent', membreId: parent.id });
    state.lierCompteParent('auth-uid-1');
    expect(useQuest.getState().foyer.ownerAuthId).toBe('auth-uid-1');
    expect(
      useQuest.getState().foyer.membres.find(m => m.id === parent.id)!
        .authUserId
    ).toBe('auth-uid-1');

    const local = useQuest.getState().foyer;
    const cloud = {
      ...local,
      nom: 'Cloud',
      updatedAt: new Date(Date.now() + 60_000).toISOString(),
    };
    expect(useQuest.getState().appliquerFoyerDistant(cloud)).toBe('ok');
    expect(useQuest.getState().foyer.nom).toBe('Cloud');

    useQuest.getState().majFoyer({ nom: 'Plus récent local' });
    const olderCloud = {
      ...useQuest.getState().foyer,
      nom: 'Ancien',
      updatedAt: new Date(0).toISOString(),
    };
    expect(useQuest.getState().appliquerFoyerDistant(olderCloud)).toBe(
      'conflit'
    );
    useQuest.getState().setConflict(olderCloud);
    useQuest.getState().resoudreConflit('cloud');
    expect(useQuest.getState().foyer.nom).toBe('Ancien');
    expect(useQuest.getState().conflict).toBeNull();
  });

  it('édite la série d’un acte', () => {
    const state = useQuest.getState();
    const parent = state.foyer.membres.find(m => m.role === 'parent')!;
    const acte = state.foyer.actes[0]!;
    state.choisirRole({ role: 'parent', membreId: parent.id });

    expect(
      state.upsertActe(acte.id, {
        titre: acte.titre,
        description: acte.description,
        portee: acte.portee,
        points: acte.points,
        minutesDirectes: acte.minutesDirectes,
        streak: { joursRequis: 5, bonusPoints: 15, bonusMinutes: 3 },
        actif: true,
      })
    ).toBeNull();

    const maj = useQuest.getState().foyer.actes.find(a => a.id === acte.id)!;
    expect(maj.streak).toEqual({
      joursRequis: 5,
      bonusPoints: 15,
      bonusMinutes: 3,
    });
  });
});
